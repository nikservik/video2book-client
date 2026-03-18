import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const specPath = resolve(process.cwd(), "docs/client-api.yaml");

if (!existsSync(specPath)) {
  throw new Error("OpenAPI spec not found at docs/client-api.yaml");
}

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "openapi-typescript",
    "docs/client-api.yaml",
    "-o",
    "electron/shared/api/schema.ts",
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.status !== 0) {
  throw new Error("Failed to generate OpenAPI types.");
}
