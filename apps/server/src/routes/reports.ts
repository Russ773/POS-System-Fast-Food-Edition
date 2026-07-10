import { Router } from "express";
import type { PaymentMethod } from "@pos/db";
import type { ReportSummary } from "@pos/shared";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const reportsRouter = Router();

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

reportsRouter.get("/summary", requireAuth(["user"]), async (req, res) => {
  const locationId = req.query.locationId as string | undefined;
  if (!locationId) return res.status(400).json({ message: "locationId is required" });

  const location = await prisma.location.findFirst({
    where: { id: locationId, orgId: req.auth!.orgId },
  });
  if (!location) return res.status(404).json({ message: "Location not found" });

  // Default window: last 7 days (inclusive of today).
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const from = req.query.from
    ? new Date(String(req.query.from))
    : new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
  // Normalize to full-day bounds.
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      locationId,
      status: { not: "CANCELLED" },
      createdAt: { gte: from, lte: to },
    },
    include: { items: { include: { menuItem: true } }, payments: true },
  });

  let totalCents = 0;
  const byDayMap = new Map<string, { totalCents: number; orderCount: number }>();
  const topItemsMap = new Map<string, { name: string; quantity: number; totalCents: number }>();
  const paymentMap = new Map<PaymentMethod, { totalCents: number; count: number }>();

  for (const order of orders) {
    totalCents += order.totalCents;

    const key = dayKey(order.createdAt);
    const day = byDayMap.get(key) ?? { totalCents: 0, orderCount: 0 };
    day.totalCents += order.totalCents;
    day.orderCount += 1;
    byDayMap.set(key, day);

    for (const item of order.items) {
      const entry =
        topItemsMap.get(item.menuItemId) ?? { name: item.menuItem.name, quantity: 0, totalCents: 0 };
      entry.quantity += item.quantity;
      entry.totalCents += item.unitPriceCents * item.quantity;
      topItemsMap.set(item.menuItemId, entry);
    }

    for (const payment of order.payments) {
      if (payment.status !== "CAPTURED") continue;
      const p = paymentMap.get(payment.method) ?? { totalCents: 0, count: 0 };
      p.totalCents += payment.amountCents;
      p.count += 1;
      paymentMap.set(payment.method, p);
    }
  }

  // Fill every day in the range so charts have no gaps.
  const byDay: ReportSummary["byDay"] = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d);
    const entry = byDayMap.get(key) ?? { totalCents: 0, orderCount: 0 };
    byDay.push({ date: key, totalCents: entry.totalCents, orderCount: entry.orderCount });
  }

  const topItems = [...topItemsMap.entries()]
    .map(([menuItemId, v]) => ({ menuItemId, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const byPaymentMethod = [...paymentMap.entries()].map(([method, v]) => ({ method, ...v }));

  const summary: ReportSummary = {
    from: dayKey(from),
    to: dayKey(to),
    totalCents,
    orderCount: orders.length,
    avgOrderCents: orders.length ? Math.round(totalCents / orders.length) : 0,
    byDay,
    topItems,
    byPaymentMethod,
  };
  res.json(summary);
});
