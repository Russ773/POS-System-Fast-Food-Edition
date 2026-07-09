import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { SOCKET_EVENTS, type Order } from "@pos/shared";
import { env } from "./env.js";

let io: Server | undefined;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins.length ? env.corsOrigins : "*" },
  });

  io.on("connection", (socket) => {
    socket.on("location:join", (locationId: string) => {
      socket.join(locationRoom(locationId));
    });
  });

  return io;
}

function locationRoom(locationId: string) {
  return `location:${locationId}`;
}

export function emitOrderCreated(order: Order) {
  io?.to(locationRoom(order.locationId)).emit(SOCKET_EVENTS.ORDER_CREATED, order);
}

export function emitOrderUpdated(order: Order) {
  io?.to(locationRoom(order.locationId)).emit(SOCKET_EVENTS.ORDER_UPDATED, order);
}
