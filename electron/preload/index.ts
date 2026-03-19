import { contextBridge, ipcRenderer } from "electron";
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
  settings: {
    async get() {
      return ipcRenderer.invoke("settings:get");
    },
    async saveToken(rawInput) {
      return ipcRenderer.invoke("settings:saveToken", rawInput);
    },
  },
  projects: {
    async list() {
      return ipcRenderer.invoke("projects:list");
    },
    async getLessons(projectId) {
      return ipcRenderer.invoke("projects:getLessons", projectId);
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
