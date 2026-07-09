import type { Order } from "./entities";

export const SOCKET_EVENTS = {
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
} as const;

export interface ServerToClientEvents {
  [SOCKET_EVENTS.ORDER_CREATED]: (order: Order) => void;
  [SOCKET_EVENTS.ORDER_UPDATED]: (order: Order) => void;
}

export interface ClientToServerEvents {
  "location:join": (locationId: string) => void;
}
