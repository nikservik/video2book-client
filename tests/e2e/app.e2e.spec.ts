import { expect, test } from "@playwright/test";
import { _electron as electron } from "playwright";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..", "..");

test("shows the phase 1 scaffold shell", async () => {
  const app = await electron.launch({
    args: [resolve(projectRoot, "dist-electron/main/index.js")],
    cwd: projectRoot,
  });

  const firstWindow = await app.firstWindow();

  await expect(firstWindow.getByTestId("app-ready")).toBeVisible();
  await expect(firstWindow.getByText("Projects scaffold is ready")).toBeVisible();

  await app.close();
});
