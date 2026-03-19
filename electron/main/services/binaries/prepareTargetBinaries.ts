import { spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import YTDlpWrapImport from "yt-dlp-wrap";
import { getBinaryFilename, type BinaryPaths } from "./binaryResolver";
import { PREPARED_BINARIES_MANIFEST_NAME, YT_DLP_VERSION } from "./prepareBinaries";

const require = createRequire(import.meta.url);
const YTDlpWrap = (
  "default" in YTDlpWrapImport ? YTDlpWrapImport.default : YTDlpWrapImport
) as typeof import("yt-dlp-wrap").default;

type Logger = Pick<Console, "error" | "info" | "warn">;

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

export interface PrepareTargetBundledBinariesOptions {
  arch: string;
  logger?: Logger;
  outputDir?: string;
  platform: NodeJS.Platform;
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

async function downloadUrlToFile(url: string, destinationPath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok || response.body === null) {
    throw new Error(`Не удалось скачать файл: ${url} (${response.status}).`);
  }

  await pipeline(
    Readable.fromWeb(response.body as any),
    createWriteStream(destinationPath),
  );
}

function getFfmpegReleaseTag(): string {
  const packageJson = require("ffmpeg-ffprobe-static/package.json") as {
    "ffmpeg-static": {
      "binary-release-tag": string;
    };
  };

  return packageJson["ffmpeg-static"]["binary-release-tag"];
}

function createFfmpegDownloadUrl(
  binaryName: "ffmpeg" | "ffprobe",
  platform: NodeJS.Platform,
  arch: string,
): string {
  const baseUrl =
    process.env.FFMPEG_FFPROBE_STATIC_BASE_URL ??
    "https://github.com/descriptinc/ffmpeg-ffprobe-static/releases/download/";
  const releaseTag = getFfmpegReleaseTag();

  return new URL(`${releaseTag}/${binaryName}-${platform}-${arch}`, baseUrl).href;
}

async function downloadTargetFfmpegBinary(
  binaryName: "ffmpeg" | "ffprobe",
  platform: NodeJS.Platform,
  arch: string,
  destinationPath: string,
): Promise<void> {
  const tempPath = `${destinationPath}.tmp`;

  await rm(tempPath, { force: true });
  await downloadUrlToFile(
    createFfmpegDownloadUrl(binaryName, platform, arch),
    tempPath,
  );

  if (platform !== "win32") {
    await chmod(tempPath, 0o755);
  }

  await rename(tempPath, destinationPath);
}

function resolveDenoOptionalPackageName(
  platform: NodeJS.Platform,
  arch: string,
): string {
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
      throw new Error(`Deno не поддерживает платформу ${platform}/${arch}.`);
  }
}

function getDenoVersion(): string {
  const packageJson = require("deno/package.json") as {
    version: string;
  };

  return packageJson.version;
}

function createDenoTarballUrl(
  packageName: string,
  version: string,
): string {
  const packageBasename = packageName.split("/")[1];

  return `https://registry.npmjs.org/${packageName}/-/${packageBasename}-${version}.tgz`;
}

async function downloadTargetDenoBinary(
  platform: NodeJS.Platform,
  arch: string,
  destinationPath: string,
): Promise<void> {
  const packageName = resolveDenoOptionalPackageName(platform, arch);
  const version = getDenoVersion();
  const tempDir = await mkdtemp(join(tmpdir(), `video2book-deno-${platform}-${arch}-`));
  const archivePath = join(tempDir, "deno.tgz");
  const extractedBinaryPath = join(
    tempDir,
    "package",
    getBinaryFilename("deno", platform),
  );

  try {
    await downloadUrlToFile(createDenoTarballUrl(packageName, version), archivePath);

    const extraction = spawnSync("tar", ["-xzf", archivePath, "-C", tempDir], {
      stdio: "inherit",
    });

    if (extraction.status !== 0) {
      throw new Error(`Не удалось распаковать ${packageName}@${version}.`);
    }

    if (!(await fileExists(extractedBinaryPath))) {
      throw new Error(`В архиве ${packageName}@${version} не найден бинарник Deno.`);
    }

    await copyExecutable(extractedBinaryPath, destinationPath, platform);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
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

export function resolveTargetBinaryOutputDir(
  platform: NodeJS.Platform,
  arch: string,
): string {
  return resolve(process.cwd(), "build", "bin-targets", `${platform}-${arch}`);
}

export async function prepareTargetBundledBinaries(
  options: PrepareTargetBundledBinariesOptions,
): Promise<BinaryPaths> {
  const logger = options.logger ?? console;
  const platform = options.platform;
  const arch = options.arch;
  const outputDir =
    options.outputDir ?? resolveTargetBinaryOutputDir(platform, arch);
  const ytDlpVersion = options.ytDlpVersion ?? YT_DLP_VERSION;
  const manifestPath = join(outputDir, PREPARED_BINARIES_MANIFEST_NAME);
  const expectedManifest = createManifest(platform, arch, ytDlpVersion);
  const binaryPaths: BinaryPaths = {
    denoPath: join(outputDir, getBinaryFilename("deno", platform)),
    ffmpegPath: join(outputDir, getBinaryFilename("ffmpeg", platform)),
    ffprobePath: join(outputDir, getBinaryFilename("ffprobe", platform)),
    ytDlpPath: join(outputDir, getBinaryFilename("ytDlp", platform)),
  };
  const currentManifest = await readManifest(manifestPath);
  const preparedFilesExist = isCurrentManifest(currentManifest, expectedManifest)
    ? await hasPreparedFiles(outputDir, expectedManifest)
    : false;

  if (preparedFilesExist) {
    logger.info(`Target binaries are up to date in ${outputDir}.`);
    return binaryPaths;
  }

  await mkdir(outputDir, { recursive: true });

  logger.info(`Подготавливаю target binaries для ${platform}/${arch} в ${outputDir}.`);

  await downloadTargetFfmpegBinary(
    "ffmpeg",
    platform,
    arch,
    binaryPaths.ffmpegPath,
  );
  await downloadTargetFfmpegBinary(
    "ffprobe",
    platform,
    arch,
    binaryPaths.ffprobePath,
  );
  await downloadTargetDenoBinary(platform, arch, binaryPaths.denoPath);

  const ytDlpTempPath = `${binaryPaths.ytDlpPath}.tmp`;

  await rm(ytDlpTempPath, { force: true });
  await downloadPinnedYtDlpBinary(ytDlpTempPath, ytDlpVersion, platform);

  if (platform !== "win32") {
    await chmod(ytDlpTempPath, 0o755);
  }

  await rename(ytDlpTempPath, binaryPaths.ytDlpPath);
  await writePreparedManifest(manifestPath, expectedManifest);

  logger.info(`Target binaries are ready in ${outputDir}.`);

  return binaryPaths;
}
