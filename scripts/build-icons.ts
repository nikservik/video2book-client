import { existsSync } from "node:fs";
import { resolve } from "node:path";

const requiredFiles = [
  "build/icons/icon.png",
  "build/icons/mac/icon.icns",
  "build/icons/win/icon.ico",
];

for (const relativePath of requiredFiles) {
  const fullPath = resolve(process.cwd(), relativePath);

  if (!existsSync(fullPath)) {
    throw new Error(`Missing required icon asset: ${relativePath}`);
  }
}

console.log("Icon assets are present and ready to use.");
