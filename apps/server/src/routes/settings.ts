import { Router } from "express";
import { updateOrgSettingsRequestSchema } from "@pos/shared";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const settingsRouter = Router();

// Readable by any authenticated client (POS needs currency to format prices).
settingsRouter.get("/", requireAuth(["user", "device", "employee"]), async (req, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.auth!.orgId } });
  if (!org) return res.status(404).json({ message: "Organization not found" });
  res.json({ orgName: org.name, currency: org.currency, taxRateBps: org.taxRateBps });
});

// Only back-office users can change settings.
settingsRouter.put("/", requireAuth(["user"]), async (req, res) => {
  const parsed = updateOrgSettingsRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const org = await prisma.organization.update({
    where: { id: req.auth!.orgId },
    data: {
      ...(parsed.data.orgName !== undefined ? { name: parsed.data.orgName } : {}),
      ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency.toUpperCase() } : {}),
      ...(parsed.data.taxRateBps !== undefined ? { taxRateBps: parsed.data.taxRateBps } : {}),
    },
  });
  res.json({ orgName: org.name, currency: org.currency, taxRateBps: org.taxRateBps });
});
