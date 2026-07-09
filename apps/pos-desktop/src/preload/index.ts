import { contextBridge, ipcRenderer } from "electron";
import type { CreateOrderRequest, MenuCategory, MenuItem } from "@pos/shared";
import { IPC, type ConnStatus, type PairingState } from "../shared/ipc.js";

const apiUrl = process.env.VITE_API_URL ?? "http://localhost:4000";

const bridge = {
  apiUrl,
  getPairing: () => ipcRenderer.invoke(IPC.GET_PAIRING),
  setPairing: (state: PairingState) => ipcRenderer.invoke(IPC.SET_PAIRING, state),
  clearPairing: () => ipcRenderer.invoke(IPC.CLEAR_PAIRING),
  getCachedMenu: () => ipcRenderer.invoke(IPC.GET_CACHED_MENU),
  setCachedMenu: (menu: { categories: MenuCategory[]; items: MenuItem[] }) =>
    ipcRenderer.invoke(IPC.SET_CACHED_MENU, menu),
  enqueueOrder: (order: CreateOrderRequest) => ipcRenderer.invoke(IPC.ENQUEUE_ORDER, order),
  getStatus: () => ipcRenderer.invoke(IPC.GET_STATUS),
  onStatusChanged: (cb: (status: ConnStatus) => void) => {
    const handler = (_e: unknown, status: ConnStatus) => cb(status);
    ipcRenderer.on(IPC.STATUS_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC.STATUS_CHANGED, handler);
  },
};

contextBridge.exposeInMainWorld("pos", bridge);
