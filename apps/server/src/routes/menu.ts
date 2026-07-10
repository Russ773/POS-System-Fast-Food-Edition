import { Router } from "express";
import {
  createMenuCategoryRequestSchema,
  createMenuItemRequestSchema,
  updateMenuCategoryRequestSchema,
  updateMenuItemRequestSchema,
} from "@pos/shared";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { menuItemInclude, toMenuItemDTO } from "../serializers.js";

export const menuRouter = Router();

// Categories

menuRouter.get("/categories", requireAuth(["user", "device", "employee"]), async (req, res) => {
  const categories = await prisma.menuCategory.findMany({
    where: { orgId: req.auth!.orgId },
    orderBy: { sortOrder: "asc" },
  });
  res.json(categories);
});

menuRouter.post("/categories", requireAuth(["user"]), async (req, res) => {
  const parsed = createMenuCategoryRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const category = await prisma.menuCategory.create({
    data: { orgId: req.auth!.orgId, name: parsed.data.name, sortOrder: parsed.data.sortOrder ?? 0 },
  });
  res.status(201).json(category);
});

menuRouter.patch("/categories/:id", requireAuth(["user"]), async (req, res) => {
  const parsed = updateMenuCategoryRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const existing = await prisma.menuCategory.findFirst({
    where: { id: req.params.id, orgId: req.auth!.orgId },
  });
  if (!existing) return res.status(404).json({ message: "Category not found" });

  const category = await prisma.menuCategory.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  res.json(category);
});

menuRouter.delete("/categories/:id", requireAuth(["user"]), async (req, res) => {
  const existing = await prisma.menuCategory.findFirst({
    where: { id: req.params.id, orgId: req.auth!.orgId },
  });
  if (!existing) return res.status(404).json({ message: "Category not found" });

  await prisma.menuCategory.delete({ where: { id: existing.id } });
  res.status(204).send();
});

// Items

menuRouter.get("/items", requireAuth(["user", "device", "employee"]), async (req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { orgId: req.auth!.orgId },
    include: menuItemInclude,
    orderBy: { name: "asc" },
  });
  res.json(items.map(toMenuItemDTO));
});

menuRouter.post("/items", requireAuth(["user"]), async (req, res) => {
  const parsed = createMenuItemRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const category = await prisma.menuCategory.findFirst({
    where: { id: parsed.data.categoryId, orgId: req.auth!.orgId },
  });
  if (!category) return res.status(400).json({ message: "Invalid categoryId" });

  const item = await prisma.menuItem.create({
    data: {
      orgId: req.auth!.orgId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description,
      priceCents: parsed.data.priceCents,
      imageUrl: parsed.data.imageUrl,
      isMeal: parsed.data.isMeal,
      modifierGroups: {
        create: parsed.data.modifierGroups.map((g) => ({
          name: g.name,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          modifiers: { create: g.modifiers.map((m) => ({ name: m.name, priceDeltaCents: m.priceDeltaCents })) },
        })),
      },
      ingredients: {
        create: parsed.data.ingredients.map((ing, idx) => ({
          name: ing.name,
          includedByDefault: ing.includedByDefault,
          removable: ing.removable,
          addable: ing.addable,
          extraPriceCents: ing.extraPriceCents,
          sortOrder: ing.sortOrder || idx + 1,
        })),
      },
      recipe: {
        create: parsed.data.recipe.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantity: r.quantity,
        })),
      },
      mealComponents: {
        create: parsed.data.mealComponents.map((c) => ({
          componentItemId: c.componentItemId,
          quantity: c.quantity,
        })),
      },
    },
    include: menuItemInclude,
  });
  res.status(201).json(toMenuItemDTO(item));
});

menuRouter.patch("/items/:id", requireAuth(["user"]), async (req, res) => {
  const parsed = updateMenuItemRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const existing = await prisma.menuItem.findFirst({
    where: { id: req.params.id, orgId: req.auth!.orgId },
  });
  if (!existing) return res.status(404).json({ message: "Menu item not found" });

  const { ingredients, recipe, mealComponents, ...fields } = parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    await tx.menuItem.update({ where: { id: existing.id }, data: fields });
    // Replace the ingredient set wholesale when provided.
    if (ingredients) {
      await tx.menuItemIngredient.deleteMany({ where: { menuItemId: existing.id } });
      if (ingredients.length > 0) {
        await tx.menuItemIngredient.createMany({
          data: ingredients.map((ing, idx) => ({
            menuItemId: existing.id,
            name: ing.name,
            includedByDefault: ing.includedByDefault,
            removable: ing.removable,
            addable: ing.addable,
            extraPriceCents: ing.extraPriceCents,
            sortOrder: ing.sortOrder || idx + 1,
          })),
        });
      }
    }
    // Replace the recipe (stock usage) when provided.
    if (recipe) {
      await tx.recipeComponent.deleteMany({ where: { menuItemId: existing.id } });
      if (recipe.length > 0) {
        await tx.recipeComponent.createMany({
          data: recipe.map((r) => ({
            menuItemId: existing.id,
            inventoryItemId: r.inventoryItemId,
            quantity: r.quantity,
          })),
        });
      }
    }
    // Replace the meal component set when provided.
    if (mealComponents) {
      await tx.mealComponent.deleteMany({ where: { mealItemId: existing.id } });
      if (mealComponents.length > 0) {
        await tx.mealComponent.createMany({
          data: mealComponents.map((c) => ({
            mealItemId: existing.id,
            componentItemId: c.componentItemId,
            quantity: c.quantity,
          })),
        });
      }
    }
    return tx.menuItem.findUniqueOrThrow({ where: { id: existing.id }, include: menuItemInclude });
  });

  res.json(toMenuItemDTO(item));
});

menuRouter.delete("/items/:id", requireAuth(["user"]), async (req, res) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id: req.params.id, orgId: req.auth!.orgId },
  });
  if (!existing) return res.status(404).json({ message: "Menu item not found" });

  // Preserve order history: an item that has ever been ordered can't be hard
  // deleted (it would orphan past order lines). Steer the user to deactivate it.
  const orderCount = await prisma.orderItem.count({ where: { menuItemId: existing.id } });
  if (orderCount > 0) {
    return res.status(409).json({
      message: "This item has order history. Deactivate it instead of deleting.",
    });
  }

  // Can't delete an item that's a component of a meal — remove it from the
  // meal(s) first.
  const mealUse = await prisma.mealComponent.count({ where: { componentItemId: existing.id } });
  if (mealUse > 0) {
    return res.status(409).json({
      message: "This item is part of a meal. Remove it from the meal before deleting.",
    });
  }

  await prisma.menuItem.delete({ where: { id: existing.id } });
  res.status(204).send();
});
