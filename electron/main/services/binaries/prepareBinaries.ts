import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import YTDlpWrapImport from "yt-dlp-wrap";
import {
  getBinaryFilename,
  resolveBinaryPaths,
  type BinaryPaths,
} from "./binaryResolver";

const require = createRequire(import.meta.url);
const YTDlpWrap = (
  "default" in YTDlpWrapImport ? YTDlpWrapImport.default : YTDlpWrapImport
) as typeof import("yt-dlp-wrap").default;

export const PREPARED_BINARIES_MANIFEST_NAME = "manifest.json";
export const YT_DLP_VERSION = "2026.03.17";

type Logger = Pick<Console, "error" | "info" | "warn">;
type SourceBinaryPaths = Pick<BinaryPaths, "denoPath" | "ffmpegPath" | "ffprobePath">;

interface PreparedBinariesManifest {
  arch: string;
  files: {
    deno: string;
    ffmpeg: string;
    ffprobe: string;
    ytDlp: string;
  };
  platform: NodeJS.Platform;
  ytDlpVersion: string;
}

export interface PrepareBundledBinariesOptions {
  arch?: string;
  downloadYtDlp?: (
    filePath: string,
    version: string,
    platform: NodeJS.Platform,
  ) => Promise<void>;
  logger?: Logger;
  outputDir?: string;
  platform?: NodeJS.Platform;
  resolveSourcePaths?: (
    options: Pick<PrepareBundledBinariesOptions, "arch" | "logger" | "platform">,
  ) => Promise<SourceBinaryPaths>;
  ytDlpVersion?: string;
}

function createManifest(
  platform: NodeJS.Platform,
  arch: string,
  ytDlpVersion: string,
): PreparedBinariesManifest {
  return {
    platform,
    arch,
    ytDlpVersion,
    files: {
      deno: getBinaryFilename("deno", platform),
      ffmpeg: getBinaryFilename("ffmpeg", platform),
      ffprobe: getBinaryFilename("ffprobe", platform),
      ytDlp: getBinaryFilename("ytDlp", platform),
    },
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readManifest(
  manifestPath: string,
): Promise<PreparedBinariesManifest | null> {
  try {
    return JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as PreparedBinariesManifest;
  } catch {
    return null;
  }
}

function isCurrentManifest(
  actual: PreparedBinariesManifest | null,
  expected: PreparedBinariesManifest,
): boolean {
  if (actual === null) {
    return false;
  }

  return JSON.stringify(actual) === JSON.stringify(expected);
}

async function hasPreparedFiles(
  outputDir: string,
  manifest: PreparedBinariesManifest,
): Promise<boolean> {
  const checks = Object.values(manifest.files).map((filename) => {
    return fileExists(join(outputDir, filename));
  });

  return (await Promise.all(checks)).every(Boolean);
}

async function copyExecutable(
  sourcePath: string,
  destinationPath: string,
  platform: NodeJS.Platform,
): Promise<void> {
  await copyFile(sourcePath, destinationPath);

  if (platform !== "win32") {
    await chmod(destinationPath, 0o755);
  }
}

function resolveDenoOptionalPackageName(
  platform: NodeJS.Platform,
  arch: string,
): string | null {
  switch (`${platform}:${arch}`) {
    case "darwin:arm64":
      return "@deno/darwin-arm64";
    case "darwin:x64":
      return "@deno/darwin-x64";
    case "linux:arm64":
      return "@deno/linux-arm64-glibc";
    case "linux:x64":
      return "@deno/linux-x64-glibc";
    case "win32:arm64":
      return "@deno/win32-arm64";
    case "win32:x64":
      return "@deno/win32-x64";
    default:
      return null;
  }
}

function resolveDenoSourcePath(
  platform: NodeJS.Platform,
  arch: string,
  logger: Logger,
): string {
  const denoPackageJsonPath = require.resolve("deno/package.json");
  const bundledBinaryPath = join(
    dirname(denoPackageJsonPath),
    getBinaryFilename("deno", platform),
  );

  if (existsSync(bundledBinaryPath)) {
    return bundledBinaryPath;
  }

  const optionalPackageName = resolveDenoOptionalPackageName(platform, arch);

  if (optionalPackageName) {
    try {
      const packageJsonPath = require.resolve(`${optionalPackageName}/package.json`);
      const binaryPath = join(
        dirname(packageJsonPath),
        getBinaryFilename("deno", platform),
      );

      if (existsSync(binaryPath)) {
        return binaryPath;
      }
    } catch {
      logger.warn(
        `Не удалось найти optional binary package ${optionalPackageName}. Попробую fallback-установку Deno.`,
      );
    }
  }

  const installApi = require("deno/install_api.cjs") as {
    runInstall: () => string;
  };
  const installedBinaryPath = installApi.runInstall();

  if (!existsSync(installedBinaryPath)) {
    throw new Error("Не удалось подготовить bundled Deno binary.");
  }

  return installedBinaryPath;
}

export async function resolveSourceBinaryPaths(
  options: Pick<PrepareBundledBinariesOptions, "arch" | "logger" | "platform"> = {},
): Promise<SourceBinaryPaths> {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const logger = options.logger ?? console;
  const ffmpegModule = require("ffmpeg-ffprobe-static") as {
    ffmpegPath: string | null;
    ffprobePath: string | null;
  };
  const ffmpegPath = ffmpegModule.ffmpegPath;
  const ffprobePath = ffmpegModule.ffprobePath;

  if (!ffmpegPath || !ffprobePath) {
    throw new Error(`ffmpeg-ffprobe-static не поддерживает платформу ${platform}/${arch}.`);
  }

  if (!(await fileExists(ffmpegPath)) || !(await fileExists(ffprobePath))) {
    logger.info("Подготавливаю ffmpeg/ffprobe из ffmpeg-ffprobe-static.");

    const installScriptPath = require.resolve("ffmpeg-ffprobe-static/install.js");
    const installResult = spawnSync(process.execPath, [installScriptPath], {
      stdio: "inherit",
    });

    if (installResult.status !== 0) {
      throw new Error("Не удалось скачать ffmpeg/ffprobe для текущей платформы.");
    }
  }

  if (!(await fileExists(ffmpegPath)) || !(await fileExists(ffprobePath))) {
    throw new Error("ffmpeg/ffprobe binary так и не появился после подготовки.");
  }

  return {
    ffmpegPath,
    ffprobePath,
    denoPath: resolveDenoSourcePath(platform, arch, logger),
  };
}

async function downloadPinnedYtDlpBinary(
  filePath: string,
  version: string,
  platform: NodeJS.Platform,
): Promise<void> {
  await YTDlpWrap.downloadFromGithub(filePath, version, platform);
}

async function writePreparedManifest(
  manifestPath: string,
  manifest: PreparedBinariesManifest,
): Promise<void> {
  await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2), "utf8");
  await rename(`${manifestPath}.tmp`, manifestPath);
}

export async function prepareBundledBinaries(
  options: PrepareBundledBinariesOptions = {},
): Promise<BinaryPaths> {
  const logger = options.logger ?? console;
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const outputDir = options.outputDir ?? resolve(process.cwd(), "build", "bin");
  const ytDlpVersion = options.ytDlpVersion ?? YT_DLP_VERSION;
  const manifestPath = join(outputDir, PREPARED_BINARIES_MANIFEST_NAME);
  const expectedManifest = createManifest(platform, arch, ytDlpVersion);
  const binaryPaths = resolveBinaryPaths({
    appPath: dirname(dirname(outputDir)),
    platform,
  });
  const currentManifest = await readManifest(manifestPath);

  if (
    isCurrentManifest(currentManifest, expectedManifest) &&
    (await hasPreparedFiles(outputDir, expectedManifest))
  ) {
    logger.info(`Bundled binaries are up to date in ${outputDir}.`);
    return binaryPaths;
  }

  await mkdir(outputDir, { recursive: true });

  const sourcePaths = options.resolveSourcePaths
    ? await options.resolveSourcePaths({ arch, logger, platform })
    : await resolveSourceBinaryPaths({ arch, logger, platform });

  await copyExecutable(sourcePaths.ffmpegPath, binaryPaths.ffmpegPath, platform);
  await copyExecutable(sourcePaths.ffprobePath, binaryPaths.ffprobePath, platform);
  await copyExecutable(sourcePaths.denoPath, binaryPaths.denoPath, platform);

  const ytDlpTempPath = `${binaryPaths.ytDlpPath}.tmp`;

  await rm(ytDlpTempPath, { force: true });
  await (options.downloadYtDlp ?? downloadPinnedYtDlpBinary)(
    ytDlpTempPath,
    ytDlpVersion,
    platform,
  );

  if (platform !== "win32") {
    await chmod(ytDlpTempPath, 0o755);
  }

  await rename(ytDlpTempPath, binaryPaths.ytDlpPath);
  await writePreparedManifest(manifestPath, expectedManifest);

  logger.info(`Bundled binaries are ready in ${outputDir}.`);

  return binaryPaths;
}
