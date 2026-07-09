import { Router } from "express";
import { createInventoryItemRequestSchema, updateInventoryItemRequestSchema } from "@pos/shared";
import { prisma } from "../prisma.js";
import { authLocationId } from "../jwt.js";
import { requireAuth } from "../middleware/auth.js";

export const inventoryRouter = Router();

// Inventory is location-scoped; admin-web users manage it per-location via ?locationId=
async function resolveLocationId(req: import("express").Request): Promise<string | null> {
  const locationId = req.query.locationId as string | undefined;
  const scoped = authLocationId(req.auth!);
  if (scoped) return scoped;
  if (!locationId) return null;
  const location = await prisma.location.findFirst({
    where: { id: locationId, orgId: req.auth!.orgId },
  });
  return location ? location.id : null;
}

inventoryRouter.get("/", requireAuth(["user", "device", "employee"]), async (req, res) => {
  const locationId = await resolveLocationId(req);
  if (!locationId) return res.status(400).json({ message: "locationId is required" });

  const items = await prisma.inventoryItem.findMany({
    where: { locationId },
    orderBy: { name: "asc" },
  });
  res.json(items);
});

inventoryRouter.post("/", requireAuth(["user"]), async (req, res) => {
  const locationId = await resolveLocationId(req);
  if (!locationId) return res.status(400).json({ message: "locationId is required" });

  const parsed = createInventoryItemRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const item = await prisma.inventoryItem.create({
    data: { locationId, ...parsed.data },
  });
  res.status(201).json(item);
});

inventoryRouter.patch("/:id", requireAuth(["user"]), async (req, res) => {
  const parsed = updateInventoryItemRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const existing = await prisma.inventoryItem.findFirst({
    where: { id: req.params.id, location: { orgId: req.auth!.orgId } },
  });
  if (!existing) return res.status(404).json({ message: "Inventory item not found" });

  const item = await prisma.inventoryItem.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  res.json(item);
});

inventoryRouter.delete("/:id", requireAuth(["user"]), async (req, res) => {
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: req.params.id, location: { orgId: req.auth!.orgId } },
  });
  if (!existing) return res.status(404).json({ message: "Inventory item not found" });

  await prisma.inventoryItem.delete({ where: { id: existing.id } });
  res.status(204).send();
});
