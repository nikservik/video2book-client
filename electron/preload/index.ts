import { contextBridge } from "electron";
import type { ElectronApi } from "../shared/dto/ipc";
import { APP_NAME } from "../shared/dto/ipc";

const api: ElectronApi = {
  async ping() {
    return "pong";
  },
  async getRuntimeInfo() {
    return {
      appName: APP_NAME,
      platform: process.platform,
      versions: {
        chrome: process.versions.chrome,
        electron: process.versions.electron,
        node: process.versions.node,
      },
    };
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
