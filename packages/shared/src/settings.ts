import { z } from "zod";

export const orgSettingsSchema = z.object({
  orgName: z.string(),
  currency: z.string(),
  taxRateBps: z.number().int().nonnegative(),
});
export type OrgSettings = z.infer<typeof orgSettingsSchema>;

export const updateOrgSettingsRequestSchema = z.object({
  orgName: z.string().min(1).optional(),
  currency: z.string().min(3).max(3).optional(),
  taxRateBps: z.number().int().nonnegative().max(10000).optional(),
});
export type UpdateOrgSettingsRequest = z.infer<typeof updateOrgSettingsRequestSchema>;
