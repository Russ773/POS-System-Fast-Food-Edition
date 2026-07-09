import type { CreateOrderRequest, Location, MenuCategory, MenuItem, Order } from "@pos/shared";

export interface PairingState {
  deviceToken: string;
  location: Location;
}

export interface CachedMenu {
  categories: MenuCategory[];
  items: MenuItem[];
  cachedAt: string | null;
}

export interface EnqueueResult {
  synced: boolean;
  order?: Order;
  queuedId: string;
}

export interface ConnStatus {
  online: boolean;
  pendingCount: number;
}

export const IPC = {
  GET_PAIRING: "pairing:get",
  SET_PAIRING: "pairing:set",
  CLEAR_PAIRING: "pairing:clear",
  GET_CACHED_MENU: "menu:getCached",
  SET_CACHED_MENU: "menu:setCached",
  ENQUEUE_ORDER: "order:enqueue",
  GET_STATUS: "status:get",
  STATUS_CHANGED: "status:changed",
} as const;

export interface PosBridge {
  getPairing(): Promise<PairingState | null>;
  setPairing(state: PairingState): Promise<void>;
  clearPairing(): Promise<void>;
  getCachedMenu(): Promise<CachedMenu>;
  setCachedMenu(menu: { categories: MenuCategory[]; items: MenuItem[] }): Promise<void>;
  enqueueOrder(order: CreateOrderRequest): Promise<EnqueueResult>;
  getStatus(): Promise<ConnStatus>;
  onStatusChanged(cb: (status: ConnStatus) => void): () => void;
  apiUrl: string;
}
