import { expect, test } from "@playwright/test";
import { _electron as electron } from "playwright";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..", "..");

async function launchApp() {
  const app = await electron.launch({
    args: [resolve(projectRoot, "dist-electron/main/index.js")],
    cwd: projectRoot,
  });

  const firstWindow = await app.firstWindow();

  return {
    app,
    firstWindow,
  };
}

test("shows projects list and project mock UI", async () => {
  const { app, firstWindow } = await launchApp();

  await expect(firstWindow.getByText("История дизайна")).toBeVisible();
  await expect(firstWindow.getByText("Баухаус")).toBeVisible();

  await firstWindow.getByText("Баухаус").click();

  await expect(firstWindow.getByRole("heading", { name: "Баухаус" })).toBeVisible();
  await expect(
    firstWindow.getByRole("button", { name: "Добавить урок", exact: true }),
  ).toBeVisible();

  await app.close();
});

test("returns to the projects page with the current folder reopened", async () => {
  const { app, firstWindow } = await launchApp();

  await firstWindow.getByText("Архитектура").click();
  await expect(firstWindow.getByText("Японский метаболизм")).toBeVisible();

  await firstWindow.getByText("Японский метаболизм").click();
  await expect(
    firstWindow.getByRole("heading", { name: "Японский метаболизм" }),
  ).toBeVisible();

  await firstWindow.getByRole("link", { name: "Проекты" }).click();

  await expect(firstWindow.getByText("Японский метаболизм")).toBeVisible();
  await expect(firstWindow.getByText("Баухаус")).not.toBeVisible();

  await app.close();
});
