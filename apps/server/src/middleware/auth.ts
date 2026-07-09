import type { NextFunction, Request, Response } from "express";
import { verifyToken, type AuthPayload } from "../jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(allowedTypes: AuthPayload["type"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing bearer token" });
    }
    try {
      const payload = verifyToken(header.slice("Bearer ".length));
      if (!allowedTypes.includes(payload.type)) {
        return res.status(403).json({ message: "Token type not permitted for this endpoint" });
      }
      req.auth = payload;
      next();
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}
