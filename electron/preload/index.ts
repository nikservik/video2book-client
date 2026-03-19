import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { ElectronApi } from "../shared/dto/ipc";
import { APP_NAME } from "../shared/dto/ipc";
import { QUEUE_CHANGED_EVENT } from "../shared/dto/queue";

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
  lessons: {
    async enqueueLocalFile(input) {
      return ipcRenderer.invoke("lessons:enqueueLocalFile", input);
    },
    async enqueueYoutube(input) {
      return ipcRenderer.invoke("lessons:enqueueYoutube", input);
    },
    async enqueueYoutubeBatch(input) {
      return ipcRenderer.invoke("lessons:enqueueYoutubeBatch", input);
    },
  },
  queue: {
    async getSnapshot(projectId) {
      return ipcRenderer.invoke("queue:getSnapshot", projectId);
    },
    onChanged(callback) {
      const listener = (_event: Electron.IpcRendererEvent, snapshot: Parameters<typeof callback>[0]) => {
        callback(snapshot);
      };

      ipcRenderer.on(QUEUE_CHANGED_EVENT, listener);

      return () => {
        ipcRenderer.removeListener(QUEUE_CHANGED_EVENT, listener);
      };
    },
  },
  files: {
    getPathForFile(file) {
      try {
        return webUtils.getPathForFile(file) || null;
      } catch {
        return null;
      }
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
