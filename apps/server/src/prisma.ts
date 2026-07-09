import { PrismaClient } from "@pos/db";
// Importing env first ensures the root .env (with DATABASE_URL) is loaded
// before the Prisma client reads process.env at construction time.
import "./env.js";

export const prisma = new PrismaClient();
