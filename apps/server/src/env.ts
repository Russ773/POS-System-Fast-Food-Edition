import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Load the monorepo-root .env regardless of the process cwd. Walk up from this
// file until we find a .env (repo root), so `npm run dev` from apps/server works.
function loadRootEnv() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) {
      config({ path: candidate });
      return;
    }
    dir = dirname(dir);
  }
  config(); // fall back to default lookup
}

loadRootEnv();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET"),
  corsOrigins: (process.env.CORS_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean),
};
