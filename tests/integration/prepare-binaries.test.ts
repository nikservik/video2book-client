import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PREPARED_BINARIES_MANIFEST_NAME,
  YT_DLP_VERSION,
  prepareBundledBinaries,
} from "@electron/main/services/binaries/prepareBinaries";

const temporaryDirectories: string[] = [];

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => {
      return rm(directory, { recursive: true, force: true });
    }),
  );
});

async function createFakeExecutable(path: string, contents: string): Promise<void> {
  await writeFile(path, contents, "utf8");
  await chmod(path, 0o755);
}

describe("prepareBundledBinaries", () => {
  it("copies bundled binaries and writes a manifest", async () => {
    const directory = await mkdtemp(join(tmpdir(), "video2book-client-binaries-"));
    const sourceDirectory = join(directory, "source");
    const outputDirectory = join(directory, "build", "bin");
    temporaryDirectories.push(directory);

    await mkdir(sourceDirectory, { recursive: true });

    const ffmpegSourcePath = join(sourceDirectory, "ffmpeg");
    const ffprobeSourcePath = join(sourceDirectory, "ffprobe");
    const denoSourcePath = join(sourceDirectory, "deno");

    await createFakeExecutable(ffmpegSourcePath, "ffmpeg");
    await createFakeExecutable(ffprobeSourcePath, "ffprobe");
    await createFakeExecutable(denoSourcePath, "deno");

    const downloadYtDlp = vi.fn(async (filePath: string) => {
      await createFakeExecutable(filePath, "yt-dlp");
    });

    const binaryPaths = await prepareBundledBinaries({
      outputDir: outputDirectory,
      platform: "darwin",
      arch: "arm64",
      logger: silentLogger,
      resolveSourcePaths: async () => {
        return {
          denoPath: denoSourcePath,
          ffmpegPath: ffmpegSourcePath,
          ffprobePath: ffprobeSourcePath,
        };
      },
      downloadYtDlp,
    });

    expect(await readFile(binaryPaths.denoPath, "utf8")).toBe("deno");
    expect(await readFile(binaryPaths.ffmpegPath, "utf8")).toBe("ffmpeg");
    expect(await readFile(binaryPaths.ffprobePath, "utf8")).toBe("ffprobe");
    expect(await readFile(binaryPaths.ytDlpPath, "utf8")).toBe("yt-dlp");
    expect(downloadYtDlp).toHaveBeenCalledOnce();

    expect(
      JSON.parse(
        await readFile(join(outputDirectory, PREPARED_BINARIES_MANIFEST_NAME), "utf8"),
      ),
    ).toEqual({
      platform: "darwin",
      arch: "arm64",
      ytDlpVersion: YT_DLP_VERSION,
      files: {
        deno: "deno",
        ffmpeg: "ffmpeg",
        ffprobe: "ffprobe",
        ytDlp: "yt-dlp",
      },
    });
  });

  it("reuses prepared binaries when manifest and files are current", async () => {
    const directory = await mkdtemp(join(tmpdir(), "video2book-client-binaries-"));
    const sourceDirectory = join(directory, "source");
    const outputDirectory = join(directory, "build", "bin");
    temporaryDirectories.push(directory);

    await mkdir(sourceDirectory, { recursive: true });

    const ffmpegSourcePath = join(sourceDirectory, "ffmpeg");
    const ffprobeSourcePath = join(sourceDirectory, "ffprobe");
    const denoSourcePath = join(sourceDirectory, "deno");

    await createFakeExecutable(ffmpegSourcePath, "ffmpeg");
    await createFakeExecutable(ffprobeSourcePath, "ffprobe");
    await createFakeExecutable(denoSourcePath, "deno");

    const resolveSourcePaths = vi.fn(async () => {
      return {
        denoPath: denoSourcePath,
        ffmpegPath: ffmpegSourcePath,
        ffprobePath: ffprobeSourcePath,
      };
    });
    const downloadYtDlp = vi.fn(async (filePath: string) => {
      await createFakeExecutable(filePath, "yt-dlp");
    });

    await prepareBundledBinaries({
      outputDir: outputDirectory,
      platform: "darwin",
      arch: "arm64",
      logger: silentLogger,
      resolveSourcePaths,
      downloadYtDlp,
    });

    await prepareBundledBinaries({
      outputDir: outputDirectory,
      platform: "darwin",
      arch: "arm64",
      logger: silentLogger,
      resolveSourcePaths,
      downloadYtDlp,
    });

    expect(resolveSourcePaths).toHaveBeenCalledOnce();
    expect(downloadYtDlp).toHaveBeenCalledOnce();
  });
});
