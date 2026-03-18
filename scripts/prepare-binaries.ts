import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const outputDir = resolve(process.cwd(), "build/bin");

mkdirSync(outputDir, { recursive: true });

console.log(`Binary output directory is ready: ${outputDir}`);
console.log("Binary download and packaging will be implemented in phase 6.");
