import { describe, expect, it } from "vitest";
import {
  BINARY_RESOURCE_DIRECTORY,
  createYtDlpCommand,
  listMissingBinaryPaths,
  resolveBinaryPaths,
} from "@electron/main/services/binaries/binaryResolver";

describe("binary resolver", () => {
  it("resolves build/bin paths during local development", () => {
    expect(
      resolveBinaryPaths({
        appPath: "/workspace/video2book-client",
        platform: "darwin",
      }),
    ).toEqual({
      denoPath: `/workspace/video2book-client/build/${BINARY_RESOURCE_DIRECTORY}/deno`,
      ffmpegPath: `/workspace/video2book-client/build/${BINARY_RESOURCE_DIRECTORY}/ffmpeg`,
      ffprobePath: `/workspace/video2book-client/build/${BINARY_RESOURCE_DIRECTORY}/ffprobe`,
      ytDlpPath: `/workspace/video2book-client/build/${BINARY_RESOURCE_DIRECTORY}/yt-dlp`,
    });
  });

  it("resolves resources/bin for packaged apps", () => {
    expect(
      resolveBinaryPaths({
        appIsPackaged: true,
        platform: "win32",
        resourcesPath: "C:\\Program Files\\Video2Book\\resources",
      }),
    ).toEqual({
      denoPath: "C:\\Program Files\\Video2Book\\resources/bin/deno.exe",
      ffmpegPath: "C:\\Program Files\\Video2Book\\resources/bin/ffmpeg.exe",
      ffprobePath: "C:\\Program Files\\Video2Book\\resources/bin/ffprobe.exe",
      ytDlpPath: "C:\\Program Files\\Video2Book\\resources/bin/yt-dlp.exe",
    });
  });

  it("builds yt-dlp arguments with the bundled deno runtime", () => {
    expect(
      createYtDlpCommand(
        {
          ytDlpPath: "/tmp/build/bin/yt-dlp",
          denoPath: "/tmp/build/bin/deno",
        },
        ["--version"],
      ),
    ).toEqual({
      executablePath: "/tmp/build/bin/yt-dlp",
      args: ["--js-runtimes", "deno:/tmp/build/bin/deno", "--version"],
    });
  });

  it("reports which binaries are missing", () => {
    expect(
      listMissingBinaryPaths(
        {
          denoPath: "/tmp/deno",
          ffmpegPath: "/tmp/ffmpeg",
          ffprobePath: "/tmp/ffprobe",
          ytDlpPath: "/tmp/yt-dlp",
        },
        (path) => path.endsWith("ffmpeg") || path.endsWith("yt-dlp"),
      ),
    ).toEqual(["/tmp/deno", "/tmp/ffprobe"]);
  });
});
