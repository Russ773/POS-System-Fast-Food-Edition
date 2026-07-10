import { Router } from "express";
import {
  capturePaymentRequestSchema,
  createOrderRequestSchema,
  updateOrderStatusRequestSchema,
} from "@pos/shared";
import { prisma } from "../prisma.js";
import { authLocationId } from "../jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { orderInclude, toOrderDTO } from "../serializers.js";
import { emitOrderCreated, emitOrderUpdated } from "../socket.js";

export const ordersRouter = Router();

ordersRouter.get("/", requireAuth(["user", "device", "employee"]), async (req, res) => {
  const status = req.query.status as string | undefined;
  const locationId = authLocationId(req.auth!) ?? (req.query.locationId as string | undefined);
  if (!locationId) return res.status(400).json({ message: "locationId is required" });

  const orders = await prisma.order.findMany({
    where: {
      locationId,
      location: { orgId: req.auth!.orgId },
      ...(status ? { status: status as never } : {}),
    },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(orders.map(toOrderDTO));
});

ordersRouter.post("/", requireAuth(["device", "employee"]), async (req, res) => {
  const parsed = createOrderRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const existing = await prisma.order.findUnique({
    where: { clientRefId: parsed.data.clientRefId },
    include: orderInclude,
  });
  if (existing) return res.status(200).json(toOrderDTO(existing));

  const locationId = authLocationId(req.auth!)!;
  const menuItemIds = parsed.data.items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, orgId: req.auth!.orgId },
    include: {
      modifierGroups: { include: { modifiers: true } },
      ingredients: true,
      recipe: true,
      // For combos, pull each component item's own recipe so stock depletes too.
      comboComponents: { include: { componentItem: { include: { recipe: true } } } },
    },
  });
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // inventoryItemId -> total quantity to deduct across the whole order.
  const stockDeductions = new Map<string, number>();
  function deduct(inventoryItemId: string, qty: number) {
    stockDeductions.set(inventoryItemId, (stockDeductions.get(inventoryItemId) ?? 0) + qty);
  }

  let totalCents = 0;
  const orderItemsData: {
    menuItemId: string;
    quantity: number;
    unitPriceCents: number;
    notes: string | undefined;
    selectedModifiers: { modifierId: string; name: string; priceDeltaCents: number }[];
    customizations: { ingredientId: string; name: string; action: "NO" | "ADD" | "EXTRA"; priceDeltaCents: number }[];
  }[] = [];
  for (const line of parsed.data.items) {
    const menuItem = menuItemMap.get(line.menuItemId);
    if (!menuItem) return res.status(400).json({ message: `Unknown menuItemId ${line.menuItemId}` });

    const allModifiers = menuItem.modifierGroups.flatMap((g) => g.modifiers);
    const selected: { modifierId: string; name: string; priceDeltaCents: number }[] = [];
    let invalidModifierId: string | undefined;
    for (const id of line.selectedModifierIds) {
      const modifier = allModifiers.find((m) => m.id === id);
      if (!modifier) {
        invalidModifierId = id;
        break;
      }
      selected.push({ modifierId: modifier.id, name: modifier.name, priceDeltaCents: modifier.priceDeltaCents });
    }
    if (invalidModifierId) {
      return res.status(400).json({ message: `Unknown modifierId ${invalidModifierId}` });
    }

    // Validate + price ingredient customizations (no onion / extra cheese / add ketchup).
    const customizations: {
      ingredientId: string;
      name: string;
      action: "NO" | "ADD" | "EXTRA";
      priceDeltaCents: number;
    }[] = [];
    let customizationError: string | undefined;
    for (const c of line.customizations) {
      const ing = menuItem.ingredients.find((i) => i.id === c.ingredientId);
      if (!ing) {
        customizationError = `Unknown ingredientId ${c.ingredientId}`;
        break;
      }
      if (c.action === "NO" && !(ing.includedByDefault && ing.removable)) {
        customizationError = `${ing.name} cannot be removed`;
        break;
      }
      if ((c.action === "ADD" || c.action === "EXTRA") && !ing.addable) {
        customizationError = `${ing.name} cannot be added`;
        break;
      }
      // Holding an ingredient is free; adding or doubling up costs the extra price.
      const priceDeltaCents = c.action === "NO" ? 0 : ing.extraPriceCents;
      customizations.push({ ingredientId: ing.id, name: ing.name, action: c.action, priceDeltaCents });
    }
    if (customizationError) {
      return res.status(400).json({ message: customizationError });
    }

    const unitPriceCents =
      menuItem.priceCents +
      selected.reduce((s, m) => s + m.priceDeltaCents, 0) +
      customizations.reduce((s, c) => s + c.priceDeltaCents, 0);
    totalCents += unitPriceCents * line.quantity;

    // Accumulate stock usage: an item's own recipe, plus (for combos) each
    // component item's recipe times its combo quantity, all times the line qty.
    for (const r of menuItem.recipe) {
      deduct(r.inventoryItemId, r.quantity * line.quantity);
    }
    for (const cc of menuItem.comboComponents) {
      for (const r of cc.componentItem.recipe) {
        deduct(r.inventoryItemId, r.quantity * cc.quantity * line.quantity);
      }
    }

    orderItemsData.push({
      menuItemId: menuItem.id,
      quantity: line.quantity,
      unitPriceCents,
      notes: line.notes,
      selectedModifiers: selected,
      customizations,
    });
  }

  // Create the order and deplete inventory atomically.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        locationId,
        employeeId: parsed.data.employeeId ?? (req.auth!.type === "employee" ? req.auth!.sub : undefined),
        orderType: parsed.data.orderType,
        clientRefId: parsed.data.clientRefId,
        totalCents,
        items: { create: orderItemsData },
      },
      include: orderInclude,
    });
    for (const [inventoryItemId, qty] of stockDeductions) {
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityOnHand: { decrement: qty } },
      });
    }
    return created;
  });

  const dto = toOrderDTO(order);
  emitOrderCreated(dto);
  res.status(201).json(dto);
});

ordersRouter.patch("/:id/status", requireAuth(["device", "employee", "user"]), async (req, res) => {
  const parsed = updateOrderStatusRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const existing = await prisma.order.findFirst({
    where: { id: req.params.id, location: { orgId: req.auth!.orgId } },
  });
  if (!existing) return res.status(404).json({ message: "Order not found" });

  const order = await prisma.order.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
    include: orderInclude,
  });

  const dto = toOrderDTO(order);
  emitOrderUpdated(dto);
  res.json(dto);
});

ordersRouter.post("/:id/payment", requireAuth(["device", "employee"]), async (req, res) => {
  const parsed = capturePaymentRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const existing = await prisma.order.findFirst({
    where: { id: req.params.id, location: { orgId: req.auth!.orgId } },
  });
  if (!existing) return res.status(404).json({ message: "Order not found" });

  await prisma.payment.create({
    data: {
      orderId: existing.id,
      method: parsed.data.method,
      amountCents: parsed.data.amountCents,
      status: "CAPTURED",
    },
  });

  const order = await prisma.order.update({
    where: { id: existing.id },
    data: { status: existing.status === "OPEN" ? "IN_PROGRESS" : existing.status },
    include: orderInclude,
  });

  const dto = toOrderDTO(order);
  emitOrderUpdated(dto);
  res.json(dto);
});
