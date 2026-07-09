# Fast Food POS System

A multi-location Point of Sale system for the fast food industry. Monorepo built with
TypeScript end-to-end: a Node/Express + PostgreSQL API with real-time updates, a web admin
console, a kitchen display, and an offline-capable Windows POS terminal (Electron).

## Architecture

```
packages/
  shared/     Shared TS types, zod schemas, and a typed API client
  db/         Prisma schema, migrations, seed (source of truth for the data model)
  ui/         Shared touch-friendly React component library
apps/
  server/     Express REST API + Socket.io gateway (JWT + device/PIN auth)
  admin-web/  React (Vite) — menu / inventory / employee / shift management
  kds-web/    React (Vite) — live kitchen display, real-time order tickets
  pos-desktop/ Electron + React — order entry, offline order queue, mock checkout
```

Data model is multi-location from day one: `Organization → Location → (Employees, Menu,
Inventory, Orders)`.

## Prerequisites

- **Node.js** 20+ (developed on 24 LTS)
- **PostgreSQL** 17 running locally on port 5432

  A `docker-compose.yml` is provided (`docker compose up -d`) if you have Docker. This machine
  couldn't run Docker (hardware virtualization is disabled in firmware), so PostgreSQL 17 was
  installed natively instead — either approach works as long as the connection string in `.env`
  matches.

## Setup

```bash
# 1. Copy env and adjust the DATABASE_URL / JWT_SECRET if needed
cp .env.example .env

# 2. Install all workspace dependencies
npm install

# 3. Create the schema and seed sample data
npm run db:generate
npm run db:migrate
npm run db:seed
```

Seed creates:
- Org **Sample Burger Co.** with location **Downtown**
- Admin login: `admin@example.com` / `password123`
- Employee PIN: `1234` (Alex Cook)
- A few menu items (Cheeseburger with a Size modifier, Fries) and one inventory item

## Running

```bash
# API + admin-web + kds-web together
npm run dev

# Individually
npm run dev --workspace=apps/server      # http://localhost:4000
npm run dev --workspace=apps/admin-web   # http://localhost:5173
npm run dev --workspace=apps/kds-web     # http://localhost:5174
npm run dev --workspace=apps/pos-desktop # Electron window (dev)
```

`npm run db:studio` opens Prisma Studio to inspect the database.

## Order status flow

Orders move `OPEN → IN_PROGRESS → READY → COMPLETED` (plus `CANCELLED`). The POS creates orders;
the KDS advances them; changes broadcast live to every screen paired to that location via
Socket.io (room per location).

## Offline support (pos-desktop)

The Electron main process persists a small JSON store (device pairing, cached menu, and a queue
of pending orders) in the app's userData directory. When the API is unreachable, orders are
queued locally with a client-generated `clientRefId` and flushed in order when connectivity
returns; the server deduplicates on `clientRefId` so retries never create duplicate orders.

> Implementation note: the queue uses a JSON file rather than the originally-planned
> `better-sqlite3` to avoid native-module build tooling on Windows. The queue + retry semantics
> are unchanged. Swapping in SQLite later only touches `apps/pos-desktop/src/main/store.ts`.

## Not yet built (planned milestones)

Real payment processor, automatic inventory depletion / low-stock alerts, reporting dashboards,
fine-grained role permissions, receipt/kitchen printers, and signed Windows installer packaging.
Payments are currently mocked (cash/card recorded, no processor).
