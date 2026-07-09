import { z } from "zod";

export const userRoleSchema = z.enum(["OWNER", "ADMIN", "MANAGER"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const orderStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELLED",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderTypeSchema = z.enum(["DINE_IN", "TAKEOUT", "DRIVE_THRU"]);
export type OrderType = z.infer<typeof orderTypeSchema>;

export const paymentMethodSchema = z.enum(["CASH", "CARD_MOCK"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentStatusSchema = z.enum(["PENDING", "CAPTURED", "FAILED"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.coerce.date(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const locationSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable(),
  timezone: z.string(),
  createdAt: z.coerce.date(),
});
export type Location = z.infer<typeof locationSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  createdAt: z.coerce.date(),
});
export type User = z.infer<typeof userSchema>;

export const employeeSchema = z.object({
  id: z.string().uuid(),
  locationId: z.string().uuid(),
  name: z.string(),
  hourlyRateCents: z.number().int().nonnegative(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
});
export type Employee = z.infer<typeof employeeSchema>;

export const shiftSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  locationId: z.string().uuid(),
  clockIn: z.coerce.date(),
  clockOut: z.coerce.date().nullable(),
});
export type Shift = z.infer<typeof shiftSchema>;

export const modifierSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  name: z.string(),
  priceDeltaCents: z.number().int(),
});
export type Modifier = z.infer<typeof modifierSchema>;

export const modifierGroupSchema = z.object({
  id: z.string().uuid(),
  menuItemId: z.string().uuid(),
  name: z.string(),
  minSelect: z.number().int().nonnegative(),
  maxSelect: z.number().int().nonnegative(),
  modifiers: z.array(modifierSchema),
});
export type ModifierGroup = z.infer<typeof modifierGroupSchema>;

export const menuCategorySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  sortOrder: z.number().int(),
});
export type MenuCategory = z.infer<typeof menuCategorySchema>;

export const menuItemIngredientSchema = z.object({
  id: z.string().uuid(),
  menuItemId: z.string().uuid(),
  name: z.string(),
  includedByDefault: z.boolean(),
  removable: z.boolean(),
  addable: z.boolean(),
  extraPriceCents: z.number().int().nonnegative(),
  sortOrder: z.number().int(),
});
export type MenuItemIngredient = z.infer<typeof menuItemIngredientSchema>;

export const menuItemSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  priceCents: z.number().int().nonnegative(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
  modifierGroups: z.array(modifierGroupSchema),
  ingredients: z.array(menuItemIngredientSchema),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const inventoryItemSchema = z.object({
  id: z.string().uuid(),
  locationId: z.string().uuid(),
  name: z.string(),
  unit: z.string(),
  quantityOnHand: z.number(),
  reorderThreshold: z.number(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export const selectedModifierSchema = z.object({
  modifierId: z.string().uuid(),
  name: z.string(),
  priceDeltaCents: z.number().int(),
});
export type SelectedModifier = z.infer<typeof selectedModifierSchema>;

// How a build ingredient was changed on a specific order line.
// NO = hold a default ingredient; ADD = add one not normally included;
// EXTRA = double up on a default ingredient.
export const ingredientActionSchema = z.enum(["NO", "ADD", "EXTRA"]);
export type IngredientAction = z.infer<typeof ingredientActionSchema>;

export const appliedCustomizationSchema = z.object({
  ingredientId: z.string().uuid(),
  name: z.string(),
  action: ingredientActionSchema,
  priceDeltaCents: z.number().int(),
});
export type AppliedCustomization = z.infer<typeof appliedCustomizationSchema>;

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  menuItemName: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  selectedModifiers: z.array(selectedModifierSchema),
  customizations: z.array(appliedCustomizationSchema),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const paymentSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  method: paymentMethodSchema,
  amountCents: z.number().int().nonnegative(),
  status: paymentStatusSchema,
  createdAt: z.coerce.date(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const orderSchema = z.object({
  id: z.string().uuid(),
  locationId: z.string().uuid(),
  employeeId: z.string().uuid().nullable(),
  status: orderStatusSchema,
  orderType: orderTypeSchema,
  totalCents: z.number().int().nonnegative(),
  clientRefId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  items: z.array(orderItemSchema),
  payments: z.array(paymentSchema),
});
export type Order = z.infer<typeof orderSchema>;
