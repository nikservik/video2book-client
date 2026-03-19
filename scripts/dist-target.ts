import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { prepareTargetBundledBinaries, resolveTargetBinaryOutputDir } from "../electron/main/services/binaries/prepareTargetBinaries";

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function runPnpm(args: string[], env: NodeJS.ProcessEnv = {}): void {
  execFileSync("pnpm", args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });
}

function getElectronBuilderArgs(
  platform: NodeJS.Platform,
  arch: string,
  target: string,
  configPath: string,
): string[] {
  if (platform === "darwin") {
    return [
      "exec",
      "electron-builder",
      "--mac",
      target,
      arch === "arm64" ? "--arm64" : "--x64",
      "--config",
      configPath,
    ];
  }

  if (platform === "win32") {
    return [
      "exec",
      "electron-builder",
      "--win",
      target,
      "--x64",
      "--config",
      configPath,
    ];
  }

  throw new Error(`Платформа ${platform} не поддерживается dist-target.`);
}

const platform = readArgument("--platform");
const arch = readArgument("--arch");
const target = readArgument("--target");

if (!platform || !arch || !target) {
  throw new Error("Использование: dist-target --platform <platform> --arch <arch> --target <builderTarget>");
}

const typedPlatform = platform as NodeJS.Platform;
const binaryOutputDir = resolveTargetBinaryOutputDir(typedPlatform, arch);
const packageJson = JSON.parse(
  await readFile(resolve(process.cwd(), "package.json"), "utf8"),
) as {
  build: Record<string, unknown>;
};

runPnpm(["run", "build:licenses"]);
runPnpm(["run", "build"]);
await prepareTargetBundledBinaries({
  arch,
  outputDir: binaryOutputDir,
  platform: typedPlatform,
});

const tempDir = await mkdtemp(join(tmpdir(), "video2book-builder-config-"));
const configPath = join(tempDir, "builder.override.json");

try {
  await writeFile(
    configPath,
    JSON.stringify(
      {
        ...packageJson.build,
        directories: {
          ...(packageJson.build.directories as Record<string, unknown> | undefined),
          output: resolve(process.cwd(), "release"),
        },
        extraResources: [
          {
            from: binaryOutputDir,
            to: "bin",
            filter: ["**/*"],
          },
          {
            from: resolve(process.cwd(), "build", "THIRD_PARTY_LICENSES.txt"),
            to: "THIRD_PARTY_LICENSES.txt",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  runPnpm(
    getElectronBuilderArgs(typedPlatform, arch, target, configPath),
    typedPlatform === "darwin"
      ? {
          CSC_IDENTITY_AUTO_DISCOVERY: "false",
        }
      : {},
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
