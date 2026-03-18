import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

function createAliases() {
  return {
    "@": resolve(projectRoot, "src"),
    "@electron": resolve(projectRoot, "electron"),
    "@tests": resolve(projectRoot, "tests"),
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: createAliases(),
    },
    build: {
      lib: {
        entry: resolve(projectRoot, "electron/main/index.ts"),
      },
      outDir: resolve(projectRoot, "dist-electron/main"),
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: createAliases(),
    },
    build: {
      lib: {
        entry: resolve(projectRoot, "electron/preload/index.ts"),
      },
      outDir: resolve(projectRoot, "dist-electron/preload"),
    },
  },
  renderer: {
    root: resolve(projectRoot, "src"),
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: createAliases(),
    },
    build: {
      outDir: resolve(projectRoot, "dist"),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(projectRoot, "src/index.html"),
      },
    },
  },
});
