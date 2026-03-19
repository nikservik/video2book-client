import { existsSync } from "node:fs";
import { join } from "node:path";

export const BINARY_RESOURCE_DIRECTORY = "bin";

export interface BinaryPaths {
  denoPath: string;
  ffmpegPath: string;
  ffprobePath: string;
  ytDlpPath: string;
}

export interface BinaryResolverOptions {
  appIsPackaged?: boolean;
  appPath?: string;
  cwd?: string;
  platform?: NodeJS.Platform;
  resourcesPath?: string;
}

type BinaryName = "deno" | "ffmpeg" | "ffprobe" | "ytDlp";

export function getBinaryFilename(
  name: BinaryName,
  platform: NodeJS.Platform = process.platform,
): string {
  const suffix = platform === "win32" ? ".exe" : "";

  switch (name) {
    case "deno":
      return `deno${suffix}`;
    case "ffmpeg":
      return `ffmpeg${suffix}`;
    case "ffprobe":
      return `ffprobe${suffix}`;
    case "ytDlp":
      return `yt-dlp${suffix}`;
  }
}

export function resolveBinaryBaseDir(
  options: BinaryResolverOptions = {},
): string {
  if (options.appIsPackaged) {
    return join(
      options.resourcesPath ?? process.resourcesPath,
      BINARY_RESOURCE_DIRECTORY,
    );
  }

  const candidateBaseDirs = [
    join(options.cwd ?? process.cwd(), "build", BINARY_RESOURCE_DIRECTORY),
  ];

  if (options.appPath) {
    candidateBaseDirs.push(
      join(options.appPath, "build", BINARY_RESOURCE_DIRECTORY),
      join(options.appPath, "..", "build", BINARY_RESOURCE_DIRECTORY),
      join(options.appPath, "..", "..", "build", BINARY_RESOURCE_DIRECTORY),
    );
  }

  const existingBaseDir = candidateBaseDirs.find((candidatePath) => {
    return existsSync(candidatePath);
  });

  return existingBaseDir ?? candidateBaseDirs[0];
}

export function resolveBinaryPaths(
  options: BinaryResolverOptions = {},
): BinaryPaths {
  const platform = options.platform ?? process.platform;
  const baseDir = resolveBinaryBaseDir(options);

  return {
    denoPath: join(baseDir, getBinaryFilename("deno", platform)),
    ffmpegPath: join(baseDir, getBinaryFilename("ffmpeg", platform)),
    ffprobePath: join(baseDir, getBinaryFilename("ffprobe", platform)),
    ytDlpPath: join(baseDir, getBinaryFilename("ytDlp", platform)),
  };
}

export function listMissingBinaryPaths(
  binaryPaths: BinaryPaths,
  pathExists: (path: string) => boolean = existsSync,
): string[] {
  return Object.values(binaryPaths).filter((path) => !pathExists(path));
}

export function createYtDlpCommand(
  binaryPaths: Pick<BinaryPaths, "denoPath" | "ytDlpPath">,
  args: string[],
): {
  args: string[];
  executablePath: string;
} {
  return {
    executablePath: binaryPaths.ytDlpPath,
    args: ["--js-runtimes", `deno:${binaryPaths.denoPath}`, ...args],
  };
}
