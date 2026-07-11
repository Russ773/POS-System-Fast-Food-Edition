import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  devicePairRequestSchema,
  employeePinLoginRequestSchema,
  loginRequestSchema,
} from "@pos/shared";
import { prisma } from "../prisma.js";
import { authLocationId, signToken } from "../jwt.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const parsed = loginRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken({ type: "user", sub: user.id, orgId: user.orgId, role: user.role });
  const [locations, org] = await Promise.all([
    prisma.location.findMany({ where: { orgId: user.orgId } }),
    prisma.organization.findUnique({ where: { id: user.orgId } }),
  ]);
  res.json({
    token,
    user: {
      id: user.id,
      orgId: user.orgId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
    locations,
    settings: {
      orgName: org?.name ?? "",
      currency: org?.currency ?? "USD",
      taxRateBps: org?.taxRateBps ?? 0,
    },
  });
});

authRouter.post("/device-pair", requireAuth(["user"]), async (req, res) => {
  const parsed = devicePairRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const location = await prisma.location.findFirst({
    where: { id: parsed.data.locationId, orgId: req.auth!.orgId },
  });
  if (!location) return res.status(404).json({ message: "Location not found" });

  const device = await prisma.device.create({
    data: {
      locationId: location.id,
      name: parsed.data.deviceName,
      tokenHash: "",
    },
  });

  const deviceToken = signToken({
    type: "device",
    sub: device.id,
    orgId: req.auth!.orgId,
    locationId: location.id,
  });

  await prisma.device.update({
    where: { id: device.id },
    data: { tokenHash: await bcrypt.hash(deviceToken, 10) },
  });

  res.json({
    deviceToken,
    location: {
      id: location.id,
      orgId: location.orgId,
      name: location.name,
      address: location.address,
      timezone: location.timezone,
      createdAt: location.createdAt,
    },
  });
});

authRouter.post("/employee-pin-login", requireAuth(["device"]), async (req, res) => {
  const parsed = employeePinLoginRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
  if (parsed.data.locationId !== authLocationId(req.auth!)) {
    return res.status(403).json({ message: "Location mismatch for this device" });
  }

  const employees = await prisma.employee.findMany({
    where: { locationId: parsed.data.locationId, isActive: true },
  });

  let matched = null;
  for (const employee of employees) {
    if (await bcrypt.compare(parsed.data.pin, employee.pinHash)) {
      matched = employee;
      break;
    }
  }
  if (!matched) return res.status(401).json({ message: "Invalid PIN" });

  const employeeToken = signToken({
    type: "employee",
    sub: matched.id,
    orgId: req.auth!.orgId,
    locationId: matched.locationId,
  });

  res.json({
    employeeToken,
    employee: {
      id: matched.id,
      locationId: matched.locationId,
      name: matched.name,
      hourlyRateCents: matched.hourlyRateCents,
      isActive: matched.isActive,
      createdAt: matched.createdAt,
    },
  });
});
