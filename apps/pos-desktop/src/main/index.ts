import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import type { CreateOrderRequest, MenuCategory, MenuItem } from "@pos/shared";
import { IPC, type PairingState } from "../shared/ipc.js";
import { Store } from "./store.js";
import { SyncEngine } from "./sync.js";

const store = new Store();
const sync = new SyncEngine(store);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  sync.onStatus((status) => {
    mainWindow?.webContents.send(IPC.STATUS_CHANGED, status);
  });
}

function registerIpc() {
  ipcMain.handle(IPC.GET_PAIRING, () => store.getPairing());
  ipcMain.handle(IPC.SET_PAIRING, (_e, state: PairingState) => store.setPairing(state));
  ipcMain.handle(IPC.CLEAR_PAIRING, () => store.clearPairing());
  ipcMain.handle(IPC.GET_CACHED_MENU, () => store.getMenu());
  ipcMain.handle(
    IPC.SET_CACHED_MENU,
    (_e, menu: { categories: MenuCategory[]; items: MenuItem[] }) => store.setMenu(menu),
  );
  ipcMain.handle(IPC.ENQUEUE_ORDER, (_e, order: CreateOrderRequest) =>
    sync.enqueueAndTrySend(order),
  );
  ipcMain.handle(IPC.GET_STATUS, () => sync.getStatus());
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  sync.start();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  sync.stop();
  if (process.platform !== "darwin") app.quit();
});
