import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "./env.js";

export type AuthPayload =
  | { type: "user"; sub: string; orgId: string; role: string }
  | { type: "device"; sub: string; orgId: string; locationId: string }
  | { type: "employee"; sub: string; orgId: string; locationId: string };

const EXPIRY: Record<AuthPayload["type"], SignOptions["expiresIn"]> = {
  user: "12h",
  device: "365d",
  employee: "12h",
};

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: EXPIRY[payload.type] });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, env.jwtSecret) as AuthPayload;
}

// Location scope for device/employee tokens (undefined for user tokens).
export function authLocationId(auth: AuthPayload): string | undefined {
  return "locationId" in auth ? auth.locationId : undefined;
}
