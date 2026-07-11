import "express-async-errors";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { locationsRouter } from "./routes/locations.js";
import { menuRouter } from "./routes/menu.js";
import { inventoryRouter } from "./routes/inventory.js";
import { employeesRouter, shiftsRouter } from "./routes/employees.js";
import { ordersRouter } from "./routes/orders.js";
import { reportsRouter } from "./routes/reports.js";
import { settingsRouter } from "./routes/settings.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigins.length ? env.corsOrigins : "*" }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/locations", locationsRouter);
  app.use("/menu", menuRouter);
  app.use("/inventory", inventoryRouter);
  app.use("/employees", employeesRouter);
  app.use("/shifts", shiftsRouter);
  app.use("/orders", ordersRouter);
  app.use("/reports", reportsRouter);
  app.use("/settings", settingsRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
