import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS, type Order } from "@pos/shared";
import { api, SOCKET_URL } from "./api";

// Orders that have left the kitchen queue are not shown on the board.
const ACTIVE_STATUSES = new Set<Order["status"]>(["OPEN", "IN_PROGRESS", "READY"]);

export function useOrderFeed(locationId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!locationId) return;

    let cancelled = false;
    api.orders.list({ locationId }).then((initial) => {
      if (!cancelled) setOrders(initial.filter((o) => ACTIVE_STATUSES.has(o.status)));
    });

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("location:join", locationId);
    });
    socket.on("disconnect", () => setConnected(false));

    function upsert(order: Order) {
      setOrders((prev) => {
        const rest = prev.filter((o) => o.id !== order.id);
        if (!ACTIVE_STATUSES.has(order.status)) return rest;
        return [...rest, order].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    }

    socket.on(SOCKET_EVENTS.ORDER_CREATED, upsert);
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, upsert);

    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [locationId]);

  return { orders, connected };
}
