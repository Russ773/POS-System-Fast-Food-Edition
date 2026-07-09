import { Router } from "express";
import bcrypt from "bcryptjs";
import { createEmployeeRequestSchema, updateEmployeeRequestSchema } from "@pos/shared";
import { prisma } from "../prisma.js";
import { authLocationId } from "../jwt.js";
import { requireAuth } from "../middleware/auth.js";

export const employeesRouter = Router();

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

function toEmployeeDTO(e: {
  id: string;
  locationId: string;
  name: string;
  hourlyRateCents: number;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: e.id,
    locationId: e.locationId,
    name: e.name,
    hourlyRateCents: e.hourlyRateCents,
    isActive: e.isActive,
    createdAt: e.createdAt,
  };
}

employeesRouter.get("/", requireAuth(["user", "device"]), async (req, res) => {
  const locationId = await resolveLocationId(req);
  if (!locationId) return res.status(400).json({ message: "locationId is required" });

  const employees = await prisma.employee.findMany({
    where: { locationId },
    orderBy: { name: "asc" },
  });
  res.json(employees.map(toEmployeeDTO));
});

employeesRouter.post("/", requireAuth(["user"]), async (req, res) => {
  const locationId = await resolveLocationId(req);
  if (!locationId) return res.status(400).json({ message: "locationId is required" });

  const parsed = createEmployeeRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const employee = await prisma.employee.create({
    data: {
      locationId,
      name: parsed.data.name,
      pinHash: await bcrypt.hash(parsed.data.pin, 10),
      hourlyRateCents: parsed.data.hourlyRateCents,
    },
  });
  res.status(201).json(toEmployeeDTO(employee));
});

employeesRouter.patch("/:id", requireAuth(["user"]), async (req, res) => {
  const parsed = updateEmployeeRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const existing = await prisma.employee.findFirst({
    where: { id: req.params.id, location: { orgId: req.auth!.orgId } },
  });
  if (!existing) return res.status(404).json({ message: "Employee not found" });

  const { pin, ...rest } = parsed.data;
  const employee = await prisma.employee.update({
    where: { id: existing.id },
    data: { ...rest, ...(pin ? { pinHash: await bcrypt.hash(pin, 10) } : {}) },
  });
  res.json(toEmployeeDTO(employee));
});

employeesRouter.post("/:id/clock-in", requireAuth(["employee"]), async (req, res) => {
  if (req.auth!.sub !== req.params.id) {
    return res.status(403).json({ message: "Employees may only clock themselves in" });
  }
  const openShift = await prisma.shift.findFirst({
    where: { employeeId: req.params.id, clockOut: null },
  });
  if (openShift) return res.status(409).json({ message: "Already clocked in" });

  const shift = await prisma.shift.create({
    data: { employeeId: req.params.id, locationId: authLocationId(req.auth!)! },
  });
  res.status(201).json(shift);
});

employeesRouter.post("/:id/clock-out", requireAuth(["employee"]), async (req, res) => {
  if (req.auth!.sub !== req.params.id) {
    return res.status(403).json({ message: "Employees may only clock themselves out" });
  }
  const openShift = await prisma.shift.findFirst({
    where: { employeeId: req.params.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
  if (!openShift) return res.status(409).json({ message: "No open shift" });

  const shift = await prisma.shift.update({
    where: { id: openShift.id },
    data: { clockOut: new Date() },
  });
  res.json(shift);
});

export const shiftsRouter = Router();

shiftsRouter.get("/", requireAuth(["user"]), async (req, res) => {
  const locationId = req.query.locationId as string | undefined;
  const shifts = await prisma.shift.findMany({
    where: {
      employee: { location: { orgId: req.auth!.orgId } },
      ...(locationId ? { locationId } : {}),
    },
    orderBy: { clockIn: "desc" },
    take: 200,
  });
  res.json(shifts);
});
