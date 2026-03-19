import { expect, test } from "@playwright/test";
import { _electron as electron } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..", "..");
const prismPort = 4011;
const prismBaseUrl = `http://127.0.0.1:${prismPort}`;

let prismProcess: ChildProcess | null = null;

async function waitForPrismServer(): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${prismBaseUrl}/api/folders`, {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer test-token",
        },
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Prism is still starting.
    }

    await delay(250);
  }

  throw new Error("Prism mock server did not start in time.");
}

test.beforeAll(async () => {
  prismProcess = spawn(
    "pnpm",
    [
      "exec",
      "prism",
      "mock",
      "docs/client-api.yaml",
      "--host",
      "127.0.0.1",
      "--port",
      String(prismPort),
    ],
    {
      cwd: projectRoot,
      shell: process.platform === "win32",
      stdio: ["ignore", "ignore", "ignore"],
    },
  );

  await waitForPrismServer();
});

test.afterAll(async () => {
  prismProcess?.kill("SIGTERM");
  await delay(200);
});

async function createUserDataPath(hasToken: boolean): Promise<string> {
  const userDataPath = await mkdtemp(join(tmpdir(), "video2book-client-e2e-"));

  if (hasToken) {
    await writeFile(
      join(userDataPath, "config.json"),
      JSON.stringify(
        {
          accessTokenPlaintext: "test-token",
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  return userDataPath;
}

async function launchApp(options: { hasToken?: boolean } = {}) {
  const userDataPath = await createUserDataPath(options.hasToken ?? true);
  const app = await electron.launch({
    args: [resolve(projectRoot, "dist-electron/main/index.js")],
    cwd: projectRoot,
    env: {
      ...process.env,
      VIDEO2BOOK_API_BASE_URL: prismBaseUrl,
      VIDEO2BOOK_USER_DATA_PATH: userDataPath,
    },
  });

  const firstWindow = await app.firstWindow();

  return {
    app,
    firstWindow,
    userDataPath,
  };
}

test("shows projects list and project mock UI", async () => {
  const { app, firstWindow, userDataPath } = await launchApp();

  await expect(firstWindow.getByText("Курсы")).toBeVisible();
  await expect(firstWindow.getByText("История кино")).toBeVisible();

  await firstWindow.getByText("История кино").click();

  await expect(firstWindow.getByRole("heading", { name: "История кино" })).toBeVisible();
  await expect(
    firstWindow.getByRole("button", { name: "Добавить урок", exact: true }),
  ).toBeVisible();

  await app.close();
  await rm(userDataPath, { recursive: true, force: true });
});

test("returns to the projects page with the current folder reopened", async () => {
  const { app, firstWindow, userDataPath } = await launchApp();

  await firstWindow.getByText("История кино").click();
  await expect(
    firstWindow.getByRole("heading", { name: "История кино" }),
  ).toBeVisible();

  await firstWindow.getByRole("link", { name: "Проекты" }).click();

  await expect(firstWindow.getByText("История кино")).toBeVisible();
  await expect(firstWindow.getByText("Теория монтажа")).toBeVisible();

  await app.close();
  await rm(userDataPath, { recursive: true, force: true });
});

test("opens the token modal automatically on first launch without a saved token", async () => {
  const { app, firstWindow, userDataPath } = await launchApp({
    hasToken: false,
  });

  await expect(firstWindow.getByRole("heading", { name: "Введите токен доступа" })).toBeVisible();
  await expect(firstWindow.getByLabel("Token")).toBeVisible();

  await app.close();
  await rm(userDataPath, { recursive: true, force: true });
});
