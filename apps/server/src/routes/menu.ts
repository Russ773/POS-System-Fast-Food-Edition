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

  const item = await prisma.menuItem.update({
    where: { id: existing.id },
    data: parsed.data,
    include: menuItemInclude,
  });
  res.json(toMenuItemDTO(item));
});

menuRouter.delete("/items/:id", requireAuth(["user"]), async (req, res) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id: req.params.id, orgId: req.auth!.orgId },
  });
  if (!existing) return res.status(404).json({ message: "Menu item not found" });

  await prisma.menuItem.delete({ where: { id: existing.id } });
  res.status(204).send();
});
