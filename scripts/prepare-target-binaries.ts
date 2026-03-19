import { prepareTargetBundledBinaries, resolveTargetBinaryOutputDir } from "../electron/main/services/binaries/prepareTargetBinaries";

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const platform = readArgument("--platform");
const arch = readArgument("--arch");

if (!platform || !arch) {
  throw new Error("Использование: prepare-target-binaries --platform <platform> --arch <arch> [--output-dir <path>]");
}

const outputDir = readArgument("--output-dir") ?? resolveTargetBinaryOutputDir(platform as NodeJS.Platform, arch);
const binaryPaths = await prepareTargetBundledBinaries({
  arch,
  outputDir,
  platform: platform as NodeJS.Platform,
});

console.log("Target bundled binaries are ready:");
console.log(JSON.stringify(binaryPaths, null, 2));
