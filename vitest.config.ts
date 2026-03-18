import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

const aliases = {
  "@": resolve(projectRoot, "src"),
  "@electron": resolve(projectRoot, "electron"),
  "@tests": resolve(projectRoot, "tests"),
};

export default defineConfig({
  optimizeDeps: {
    include: ["vue-router"],
  },
  resolve: {
    alias: aliases,
  },
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage/vitest",
    },
    projects: [
      {
        resolve: {
          alias: aliases,
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias: aliases,
        },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
        },
      },
      {
        plugins: [vue()],
        resolve: {
          alias: aliases,
        },
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.ts"],
          setupFiles: ["tests/setup/component.ts"],
        },
      },
      {
        plugins: [vue()],
        resolve: {
          alias: aliases,
        },
        test: {
          name: "browser",
          include: ["tests/browser/**/*.test.ts"],
          setupFiles: ["tests/setup/component.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
