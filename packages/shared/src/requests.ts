import { z } from "zod";
import {
  employeeSchema,
  ingredientActionSchema,
  locationSchema,
  orderTypeSchema,
  paymentMethodSchema,
  userSchema,
} from "./entities";

// --- Auth ---

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
  locations: z.array(locationSchema),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const devicePairRequestSchema = z.object({
  locationId: z.string().uuid(),
  deviceName: z.string().min(1),
});
export type DevicePairRequest = z.infer<typeof devicePairRequestSchema>;

export const devicePairResponseSchema = z.object({
  deviceToken: z.string(),
  location: locationSchema,
});
export type DevicePairResponse = z.infer<typeof devicePairResponseSchema>;

export const employeePinLoginRequestSchema = z.object({
  locationId: z.string().uuid(),
  pin: z.string().min(4).max(8),
});
export type EmployeePinLoginRequest = z.infer<typeof employeePinLoginRequestSchema>;

export const employeePinLoginResponseSchema = z.object({
  employeeToken: z.string(),
  employee: employeeSchema,
});
export type EmployeePinLoginResponse = z.infer<typeof employeePinLoginResponseSchema>;

// --- Menu ---

export const createMenuCategoryRequestSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});
export type CreateMenuCategoryRequest = z.infer<typeof createMenuCategoryRequestSchema>;

export const updateMenuCategoryRequestSchema = createMenuCategoryRequestSchema.partial();
export type UpdateMenuCategoryRequest = z.infer<typeof updateMenuCategoryRequestSchema>;

export const createModifierRequestSchema = z.object({
  name: z.string().min(1),
  priceDeltaCents: z.number().int().default(0),
});

export const createModifierGroupRequestSchema = z.object({
  name: z.string().min(1),
  minSelect: z.number().int().nonnegative().default(0),
  maxSelect: z.number().int().nonnegative().default(1),
  modifiers: z.array(createModifierRequestSchema).default([]),
});

export const createIngredientRequestSchema = z.object({
  name: z.string().min(1),
  includedByDefault: z.boolean().default(true),
  removable: z.boolean().default(true),
  addable: z.boolean().default(false),
  extraPriceCents: z.number().int().nonnegative().default(0),
  sortOrder: z.number().int().default(0),
});
export type CreateIngredientRequest = z.infer<typeof createIngredientRequestSchema>;

export const recipeComponentRequestSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().nonnegative(),
});
export type RecipeComponentRequest = z.infer<typeof recipeComponentRequestSchema>;

export const mealComponentRequestSchema = z.object({
  componentItemId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});
export type MealComponentRequest = z.infer<typeof mealComponentRequestSchema>;

export const createMenuItemRequestSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  imageUrl: z.string().optional(),
  isMeal: z.boolean().default(false),
  modifierGroups: z.array(createModifierGroupRequestSchema).default([]),
  ingredients: z.array(createIngredientRequestSchema).default([]),
  recipe: z.array(recipeComponentRequestSchema).default([]),
  mealComponents: z.array(mealComponentRequestSchema).default([]),
});
export type CreateMenuItemRequest = z.infer<typeof createMenuItemRequestSchema>;

export const updateMenuItemRequestSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  // When present, replaces the item's entire ingredient set. Omit to leave
  // ingredients untouched. Safe to replace: orders snapshot customizations as
  // JSON, so historical orders don't reference these rows.
  ingredients: z.array(createIngredientRequestSchema).optional(),
  // When present, replace the recipe (stock usage) / meal component set.
  recipe: z.array(recipeComponentRequestSchema).optional(),
  mealComponents: z.array(mealComponentRequestSchema).optional(),
});
export type UpdateMenuItemRequest = z.infer<typeof updateMenuItemRequestSchema>;

// --- Inventory ---

export const createInventoryItemRequestSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  quantityOnHand: z.number().nonnegative().default(0),
  reorderThreshold: z.number().nonnegative().default(0),
});
export type CreateInventoryItemRequest = z.infer<typeof createInventoryItemRequestSchema>;

export const updateInventoryItemRequestSchema = createInventoryItemRequestSchema.partial();
export type UpdateInventoryItemRequest = z.infer<typeof updateInventoryItemRequestSchema>;

// --- Employees ---

export const createEmployeeRequestSchema = z.object({
  name: z.string().min(1),
  pin: z.string().min(4).max(8),
  hourlyRateCents: z.number().int().nonnegative().default(0),
});
export type CreateEmployeeRequest = z.infer<typeof createEmployeeRequestSchema>;

export const updateEmployeeRequestSchema = z.object({
  name: z.string().min(1).optional(),
  pin: z.string().min(4).max(8).optional(),
  hourlyRateCents: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateEmployeeRequest = z.infer<typeof updateEmployeeRequestSchema>;

// --- Orders ---

export const orderItemCustomizationRequestSchema = z.object({
  ingredientId: z.string().uuid(),
  action: ingredientActionSchema,
});
export type OrderItemCustomizationRequest = z.infer<typeof orderItemCustomizationRequestSchema>;

// Per-component choices when ordering a meal (customise the burger inside it).
export const mealSelectionRequestSchema = z.object({
  componentItemId: z.string().uuid(),
  selectedModifierIds: z.array(z.string().uuid()).default([]),
  customizations: z.array(orderItemCustomizationRequestSchema).default([]),
});
export type MealSelectionRequest = z.infer<typeof mealSelectionRequestSchema>;

export const createOrderItemRequestSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
  selectedModifierIds: z.array(z.string().uuid()).default([]),
  customizations: z.array(orderItemCustomizationRequestSchema).default([]),
  // For meal lines: customisation of each included component.
  mealSelections: z.array(mealSelectionRequestSchema).default([]),
});

export const createOrderRequestSchema = z.object({
  clientRefId: z.string().min(1),
  orderType: orderTypeSchema.default("TAKEOUT"),
  employeeId: z.string().uuid().optional(),
  items: z.array(createOrderItemRequestSchema).min(1),
});
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export const updateOrderStatusRequestSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"]),
});
export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusRequestSchema>;

export const capturePaymentRequestSchema = z.object({
  method: paymentMethodSchema,
  amountCents: z.number().int().nonnegative(),
});
export type CapturePaymentRequest = z.infer<typeof capturePaymentRequestSchema>;
