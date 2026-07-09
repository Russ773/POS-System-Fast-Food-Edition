import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const locationsRouter = Router();

const createLocationRequestSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  timezone: z.string().optional(),
});

locationsRouter.get("/", requireAuth(["user"]), async (req, res) => {
  const locations = await prisma.location.findMany({
    where: { orgId: req.auth!.orgId },
    orderBy: { name: "asc" },
  });
  res.json(locations);
});

locationsRouter.post("/", requireAuth(["user"]), async (req, res) => {
  const parsed = createLocationRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const location = await prisma.location.create({
    data: { orgId: req.auth!.orgId, ...parsed.data },
  });
  res.status(201).json(location);
});
