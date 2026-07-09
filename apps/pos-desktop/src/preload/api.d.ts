import type { PosBridge } from "../shared/ipc";

declare global {
  interface Window {
    pos: PosBridge;
  }
}

export {};
