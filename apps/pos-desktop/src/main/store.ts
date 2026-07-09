import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { CreateOrderRequest } from "@pos/shared";
import type { CachedMenu, PairingState } from "../shared/ipc.js";

interface QueuedOrder {
  queuedId: string;
  payload: CreateOrderRequest;
  createdAt: string;
}

interface StoreData {
  pairing: PairingState | null;
  menu: CachedMenu;
  queue: QueuedOrder[];
}

const DEFAULT_DATA: StoreData = {
  pairing: null,
  menu: { categories: [], items: [], cachedAt: null },
  queue: [],
};

// Simple JSON-file persistence in the Electron userData directory.
// Chosen over a native SQLite module to avoid platform build tooling; it fully
// supports the milestone-1 offline queue + cache requirement.
export class Store {
  private path: string;
  private data: StoreData;

  constructor() {
    const dir = app.getPath("userData");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.path = join(dir, "pos-store.json");
    this.data = this.read();
  }

  private read(): StoreData {
    try {
      if (existsSync(this.path)) {
        return { ...DEFAULT_DATA, ...JSON.parse(readFileSync(this.path, "utf-8")) };
      }
    } catch (err) {
      console.error("Failed to read store, starting fresh:", err);
    }
    return structuredClone(DEFAULT_DATA);
  }

  private write() {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  }

  getPairing(): PairingState | null {
    return this.data.pairing;
  }

  setPairing(state: PairingState) {
    this.data.pairing = state;
    this.write();
  }

  clearPairing() {
    this.data.pairing = null;
    this.data.queue = [];
    this.data.menu = structuredClone(DEFAULT_DATA.menu);
    this.write();
  }

  getMenu(): CachedMenu {
    return this.data.menu;
  }

  setMenu(menu: { categories: CachedMenu["categories"]; items: CachedMenu["items"] }) {
    this.data.menu = { ...menu, cachedAt: new Date().toISOString() };
    this.write();
  }

  getQueue(): QueuedOrder[] {
    return this.data.queue;
  }

  enqueue(payload: CreateOrderRequest): QueuedOrder {
    const item: QueuedOrder = {
      queuedId: payload.clientRefId,
      payload,
      createdAt: new Date().toISOString(),
    };
    // Dedupe on clientRefId so retries never double-add.
    if (!this.data.queue.some((q) => q.queuedId === item.queuedId)) {
      this.data.queue.push(item);
      this.write();
    }
    return item;
  }

  removeFromQueue(queuedId: string) {
    this.data.queue = this.data.queue.filter((q) => q.queuedId !== queuedId);
    this.write();
  }
}

export type { QueuedOrder };
