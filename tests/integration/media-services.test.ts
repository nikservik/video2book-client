import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { resolveSourceBinaryPaths } from "@electron/main/services/binaries/prepareBinaries";
import {
  createAudioTranscoder,
  createLocalMediaInspector,
} from "@electron/main/services/queue/media";
import { createAudioFixture, createVideoFixture } from "@tests/helpers/media-fixtures";

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

describe("queue media services", () => {
  it("detects direct-upload audio and transcodes local video to mp3", async () => {
    const directory = await mkdtemp(join(tmpdir(), "video2book-client-media-"));
    temporaryDirectories.push(directory);

    const binaryPaths = await resolveSourceBinaryPaths({
      logger: silentLogger,
    });
    const audioFixturePath = join(directory, "fixture.wav");
    const videoFixturePath = join(directory, "fixture.mp4");
    const transcodedAudioPath = join(directory, "fixture.mp3");
    const stderrLogPath = join(directory, "stderr.log");

    await createAudioFixture(binaryPaths.ffmpegPath, audioFixturePath);
    await createVideoFixture(binaryPaths.ffmpegPath, videoFixturePath);

    const localMediaInspector = createLocalMediaInspector({
      ffprobePath: binaryPaths.ffprobePath,
    });
    const audioTranscoder = createAudioTranscoder({
      ffmpegPath: binaryPaths.ffmpegPath,
    });

    const audioInspection = await localMediaInspector.inspect(
      audioFixturePath,
      stderrLogPath,
    );
    const videoInspection = await localMediaInspector.inspect(
      videoFixturePath,
      stderrLogPath,
    );

    expect(audioInspection.hasAudio).toBe(true);
    expect(audioInspection.hasVideo).toBe(false);
    expect(audioInspection.canUploadDirectly).toBe(true);

    expect(videoInspection.hasAudio).toBe(true);
    expect(videoInspection.hasVideo).toBe(true);
    expect(videoInspection.canUploadDirectly).toBe(false);

    await audioTranscoder.transcodeToMp3(
      videoFixturePath,
      transcodedAudioPath,
      stderrLogPath,
    );

    expect((await stat(transcodedAudioPath)).size).toBeGreaterThan(0);
  });
});
