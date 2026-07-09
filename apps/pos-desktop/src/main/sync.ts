import type { CreateOrderRequest, Order } from "@pos/shared";
import type { ConnStatus } from "../shared/ipc.js";
import type { Store } from "./store.js";

const API_URL = process.env.VITE_API_URL ?? "http://localhost:4000";

type StatusListener = (status: ConnStatus) => void;

export class SyncEngine {
  private online = false;
  private timer: NodeJS.Timeout | null = null;
  private listeners = new Set<StatusListener>();

  constructor(private store: Store) {}

  get apiUrl() {
    return API_URL;
  }

  start() {
    this.tick();
    this.timer = setInterval(() => this.tick(), 5000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  onStatus(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getStatus(): ConnStatus {
    return { online: this.online, pendingCount: this.store.getQueue().length };
  }

  private emit() {
    const status = this.getStatus();
    for (const l of this.listeners) l(status);
  }

  private async tick() {
    const wasOnline = this.online;
    this.online = await this.ping();
    if (this.online) await this.flush();
    if (wasOnline !== this.online || this.store.getQueue().length >= 0) this.emit();
  }

  private async ping(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async postOrder(payload: CreateOrderRequest): Promise<Order | null> {
    const pairing = this.store.getPairing();
    if (!pairing) return null;
    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pairing.deviceToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // 4xx means the payload is bad — drop it so it doesn't block the queue forever.
      if (res.status >= 400 && res.status < 500) {
        console.error("Dropping unprocessable queued order:", await res.text());
        return { __drop: true } as unknown as Order;
      }
      throw new Error(`Order sync failed: ${res.status}`);
    }
    return (await res.json()) as Order;
  }

  // Flush the queue in FIFO order. Stops on the first transient failure so
  // ordering is preserved; server dedupes on clientRefId if we retry a success.
  async flush(): Promise<void> {
    for (const item of [...this.store.getQueue()]) {
      try {
        const result = await this.postOrder(item.payload);
        if (result) this.store.removeFromQueue(item.queuedId);
      } catch (err) {
        console.warn("Queue flush paused:", (err as Error).message);
        break;
      }
    }
    this.emit();
  }

  // Attempt an immediate synchronous send; fall back to the queue when offline.
  async enqueueAndTrySend(payload: CreateOrderRequest) {
    const queued = this.store.enqueue(payload);
    if (this.online) {
      try {
        const order = await this.postOrder(payload);
        if (order) {
          this.store.removeFromQueue(queued.queuedId);
          this.emit();
          const isDrop = (order as unknown as { __drop?: boolean }).__drop;
          return { synced: true, order: isDrop ? undefined : order, queuedId: queued.queuedId };
        }
      } catch {
        // fall through to queued
      }
    }
    this.emit();
    return { synced: false, queuedId: queued.queuedId };
  }
}
