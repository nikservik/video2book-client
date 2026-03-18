import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";
import { APP_NAME } from "../shared/dto/ipc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(resolveRendererEntry());
  }

  return mainWindow;
}

app.setName(APP_NAME);

app.whenReady().then(() => {
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
