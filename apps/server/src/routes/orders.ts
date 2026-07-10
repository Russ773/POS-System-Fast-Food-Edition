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

type ModifierLike = { id: string; name: string; priceDeltaCents: number };
type IngredientLike = {
  id: string;
  name: string;
  includedByDefault: boolean;
  removable: boolean;
  addable: boolean;
  extraPriceCents: number;
};
type CustomizableSource = { modifierGroups: { modifiers: ModifierLike[] }[]; ingredients: IngredientLike[] };
type SelectedModifier = { modifierId: string; name: string; priceDeltaCents: number };
type AppliedCustomization = { ingredientId: string; name: string; action: "NO" | "ADD" | "EXTRA"; priceDeltaCents: number };

// Validate selected modifiers + ingredient customisations against an item's
// options, returning the priced selections (or an error message). Shared by the
// ordered item itself and by each customisable meal component.
function resolveSelections(
  source: CustomizableSource,
  selectedModifierIds: string[],
  customizations: { ingredientId: string; action: "NO" | "ADD" | "EXTRA" }[],
):
  | { ok: true; selectedModifiers: SelectedModifier[]; customizations: AppliedCustomization[]; deltaCents: number }
  | { ok: false; error: string } {
  const allModifiers = source.modifierGroups.flatMap((g) => g.modifiers);
  const selectedModifiers: SelectedModifier[] = [];
  for (const id of selectedModifierIds) {
    const modifier = allModifiers.find((m) => m.id === id);
    if (!modifier) return { ok: false, error: `Unknown modifierId ${id}` };
    selectedModifiers.push({ modifierId: modifier.id, name: modifier.name, priceDeltaCents: modifier.priceDeltaCents });
  }

  const applied: AppliedCustomization[] = [];
  for (const c of customizations) {
    const ing = source.ingredients.find((i) => i.id === c.ingredientId);
    if (!ing) return { ok: false, error: `Unknown ingredientId ${c.ingredientId}` };
    if (c.action === "NO" && !(ing.includedByDefault && ing.removable)) {
      return { ok: false, error: `${ing.name} cannot be removed` };
    }
    if ((c.action === "ADD" || c.action === "EXTRA") && !ing.addable) {
      return { ok: false, error: `${ing.name} cannot be added` };
    }
    const priceDeltaCents = c.action === "NO" ? 0 : ing.extraPriceCents;
    applied.push({ ingredientId: ing.id, name: ing.name, action: c.action, priceDeltaCents });
  }

  const deltaCents =
    selectedModifiers.reduce((s, m) => s + m.priceDeltaCents, 0) +
    applied.reduce((s, c) => s + c.priceDeltaCents, 0);
  return { ok: true, selectedModifiers, customizations: applied, deltaCents };
}

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
      // For meals, pull each component item's own recipe so stock depletes too,
      // plus its modifiers/ingredients so component customisations can be priced.
      mealComponents: {
        include: {
          componentItem: {
            include: {
              recipe: true,
              modifierGroups: { include: { modifiers: true } },
              ingredients: true,
            },
          },
        },
      },
    },
  });
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // inventoryItemId -> total quantity to deduct across the whole order.
  const stockDeductions = new Map<string, number>();
  function deduct(inventoryItemId: string, qty: number) {
    stockDeductions.set(inventoryItemId, (stockDeductions.get(inventoryItemId) ?? 0) + qty);
  }

  type MealSelectionSnapshot = {
    name: string;
    quantity: number;
    selectedModifiers: SelectedModifier[];
    customizations: AppliedCustomization[];
  };
  let totalCents = 0;
  const orderItemsData: {
    menuItemId: string;
    quantity: number;
    unitPriceCents: number;
    notes: string | undefined;
    selectedModifiers: SelectedModifier[];
    customizations: AppliedCustomization[];
    mealSelections: MealSelectionSnapshot[];
  }[] = [];
  for (const line of parsed.data.items) {
    const menuItem = menuItemMap.get(line.menuItemId);
    if (!menuItem) return res.status(400).json({ message: `Unknown menuItemId ${line.menuItemId}` });

    // Resolve the item's own modifiers + ingredient customisations.
    const own = resolveSelections(menuItem, line.selectedModifierIds, line.customizations);
    if (!own.ok) return res.status(400).json({ message: own.error });
    let lineExtraCents = own.deltaCents;

    // For meals: build a snapshot of every component (so the kitchen sees the
    // whole bundle), applying any per-component customisations and their price.
    const mealSelections: MealSelectionSnapshot[] = [];
    for (const mc of menuItem.mealComponents) {
      const sel = line.mealSelections.find((s) => s.componentItemId === mc.componentItemId);
      let compMods: SelectedModifier[] = [];
      let compCust: AppliedCustomization[] = [];
      if (sel) {
        const resolved = resolveSelections(mc.componentItem, sel.selectedModifierIds, sel.customizations);
        if (!resolved.ok) return res.status(400).json({ message: resolved.error });
        compMods = resolved.selectedModifiers;
        compCust = resolved.customizations;
        lineExtraCents += resolved.deltaCents * mc.quantity;
      }
      mealSelections.push({
        name: mc.componentItem.name,
        quantity: mc.quantity,
        selectedModifiers: compMods,
        customizations: compCust,
      });
    }

    // Meal set price already covers component base prices; only add extras.
    const unitPriceCents = menuItem.priceCents + lineExtraCents;
    totalCents += unitPriceCents * line.quantity;

    // Accumulate stock usage: an item's own recipe, plus (for meals) each
    // component item's recipe times its meal quantity, all times the line qty.
    for (const r of menuItem.recipe) {
      deduct(r.inventoryItemId, r.quantity * line.quantity);
    }
    for (const mc of menuItem.mealComponents) {
      for (const r of mc.componentItem.recipe) {
        deduct(r.inventoryItemId, r.quantity * mc.quantity * line.quantity);
      }
    }

    orderItemsData.push({
      menuItemId: menuItem.id,
      quantity: line.quantity,
      unitPriceCents,
      notes: line.notes,
      selectedModifiers: own.selectedModifiers,
      customizations: own.customizations,
      mealSelections,
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
