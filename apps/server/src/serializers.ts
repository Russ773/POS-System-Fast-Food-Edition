import type { Prisma } from "@pos/db";
import type { MenuItem, Order } from "@pos/shared";

const menuItemInclude = {
  modifierGroups: { include: { modifiers: true } },
  ingredients: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.MenuItemInclude;

export type MenuItemWithGroups = Prisma.MenuItemGetPayload<{ include: typeof menuItemInclude }>;

export function toMenuItemDTO(item: MenuItemWithGroups): MenuItem {
  return {
    id: item.id,
    orgId: item.orgId,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    isActive: item.isActive,
    modifierGroups: item.modifierGroups.map((g) => ({
      id: g.id,
      menuItemId: g.menuItemId,
      name: g.name,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      modifiers: g.modifiers.map((m) => ({
        id: m.id,
        groupId: m.groupId,
        name: m.name,
        priceDeltaCents: m.priceDeltaCents,
      })),
    })),
    ingredients: item.ingredients.map((ing) => ({
      id: ing.id,
      menuItemId: ing.menuItemId,
      name: ing.name,
      includedByDefault: ing.includedByDefault,
      removable: ing.removable,
      addable: ing.addable,
      extraPriceCents: ing.extraPriceCents,
      sortOrder: ing.sortOrder,
    })),
  };
}

export { menuItemInclude };

const orderInclude = {
  items: { include: { menuItem: true } },
  payments: true,
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toOrderDTO(order: OrderWithItems): Order {
  return {
    id: order.id,
    locationId: order.locationId,
    employeeId: order.employeeId,
    status: order.status,
    orderType: order.orderType,
    totalCents: order.totalCents,
    clientRefId: order.clientRefId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((oi) => ({
      id: oi.id,
      orderId: oi.orderId,
      menuItemId: oi.menuItemId,
      menuItemName: oi.menuItem.name,
      quantity: oi.quantity,
      unitPriceCents: oi.unitPriceCents,
      notes: oi.notes,
      selectedModifiers: (oi.selectedModifiers as Order["items"][number]["selectedModifiers"]) ?? [],
      customizations: (oi.customizations as Order["items"][number]["customizations"]) ?? [],
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      method: p.method,
      amountCents: p.amountCents,
      status: p.status,
      createdAt: p.createdAt,
    })),
  };
}

export { orderInclude };
