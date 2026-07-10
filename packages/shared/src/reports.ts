import { z } from "zod";
import { paymentMethodSchema } from "./entities";

export const salesByDaySchema = z.object({
  date: z.string(), // YYYY-MM-DD
  totalCents: z.number().int(),
  orderCount: z.number().int(),
});
export type SalesByDay = z.infer<typeof salesByDaySchema>;

export const topItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number().int(),
  totalCents: z.number().int(),
});
export type TopItem = z.infer<typeof topItemSchema>;

export const paymentBreakdownSchema = z.object({
  method: paymentMethodSchema,
  totalCents: z.number().int(),
  count: z.number().int(),
});
export type PaymentBreakdown = z.infer<typeof paymentBreakdownSchema>;

export const reportSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  totalCents: z.number().int(),
  orderCount: z.number().int(),
  avgOrderCents: z.number().int(),
  byDay: z.array(salesByDaySchema),
  topItems: z.array(topItemSchema),
  byPaymentMethod: z.array(paymentBreakdownSchema),
});
export type ReportSummary = z.infer<typeof reportSummarySchema>;
