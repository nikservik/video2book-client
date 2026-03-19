import { existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, shell } from "electron";
import { registerProjectsIpcHandlers } from "./ipc/projects";
import { registerSettingsIpcHandlers } from "./ipc/settings";
import { createApiClient } from "./services/api/apiClient";
import { resolveBinaryPaths } from "./services/binaries/binaryResolver";
import { createConfigStore } from "./services/config/configStore";
import { electronTokenCipher } from "./services/config/electronTokenCipher";
import { createLessonQueue } from "./services/queue/lessonQueue";
import {
  createAudioTranscoder,
  createLessonUploader,
  createLocalMediaInspector,
  createYoutubeDownloader,
} from "./services/queue/media";
import { createQueueRepository } from "./services/queue/repository";
import { createJobWorkspaceManager } from "./services/queue/workspace";
import { APP_NAME } from "../shared/dto/ipc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let lessonQueueSingleton: ReturnType<typeof createLessonQueue> | null = null;

const forcedUserDataPath = process.env.VIDEO2BOOK_USER_DATA_PATH;

if (forcedUserDataPath) {
  app.setPath("userData", forcedUserDataPath);
}

function resolveProjectPath(...segments: string[]): string {
  return resolve(__dirname, "..", "..", ...segments);
}

function resolveRendererEntry(): string {
  return resolveProjectPath("dist", "index.html");
}

function resolvePreloadEntry(): string {
  const jsEntry = resolve(__dirname, "..", "preload", "index.js");

  if (existsSync(jsEntry)) {
    return jsEntry;
  }

  return resolve(__dirname, "..", "preload", "index.mjs");
}

function resolveWindowIcon(): string | undefined {
  const iconPath = resolveProjectPath("build", "icons", "icon.png");

  return existsSync(iconPath) ? iconPath : undefined;
}

function isExternalHttpUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function openExternalUrl(url: string): void {
  if (!isExternalHttpUrl(url)) {
    return;
  }

  void shell.openExternal(url);
}

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    icon: resolveWindowIcon(),
    webPreferences: {
      preload: resolvePreloadEntry(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalHttpUrl(url)) {
      openExternalUrl(url);

      return {
        action: "deny",
      };
    }

    return {
      action: "allow",
    };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isExternalHttpUrl(url)) {
      return;
    }

    event.preventDefault();
    openExternalUrl(url);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(resolveRendererEntry());
  }

  return mainWindow;
}

app.setName(APP_NAME);

app.whenReady().then(() => {
  const configStore = createConfigStore({
    configPath: join(app.getPath("userData"), "config.json"),
    tokenCipher: electronTokenCipher,
    logger: process.env.NODE_ENV === "production" ? undefined : console,
  });
  const binaryPaths = resolveBinaryPaths({
    appIsPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    platform: process.platform,
    resourcesPath: process.resourcesPath,
  });
  lessonQueueSingleton = createLessonQueue({
    queueRepository: createQueueRepository({
      statePath: join(app.getPath("userData"), "queue", "state.json"),
    }),
    workspaceManager: createJobWorkspaceManager({
      jobsRootDir: join(app.getPath("userData"), "queue", "jobs"),
    }),
    localMediaInspector: createLocalMediaInspector({
      ffprobePath: binaryPaths.ffprobePath,
    }),
    audioTranscoder: createAudioTranscoder({
      ffmpegPath: binaryPaths.ffmpegPath,
    }),
    youtubeDownloader: createYoutubeDownloader({
      denoPath: binaryPaths.denoPath,
      ytDlpPath: binaryPaths.ytDlpPath,
    }),
    lessonUploader: createLessonUploader({
      createApiClient: async () => {
        const accessToken = await configStore.getAccessToken();

        if (!accessToken) {
          throw new Error("Введите токен доступа в настройках.");
        }

        return createApiClient({
          accessToken,
        });
      },
    }),
    logger: process.env.NODE_ENV === "production" ? undefined : console,
  });

  registerSettingsIpcHandlers({
    configStore,
  });
  registerProjectsIpcHandlers({
    configStore,
  });
  void lessonQueueSingleton.start();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
