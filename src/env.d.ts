/// <reference types="vite/client" />

import type { ElectronApi } from "@electron/shared/dto/ipc";

declare global {
  interface Window {
    electronAPI: ElectronApi;
  }
}

export {};
