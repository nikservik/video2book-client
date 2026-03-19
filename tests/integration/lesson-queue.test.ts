import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LessonItem } from "../../src/types/ui";
import type { QueueJobSnapshot } from "@electron/shared/dto/queue";
import { resolveSourceBinaryPaths } from "@electron/main/services/binaries/prepareBinaries";
import { createLessonQueue } from "@electron/main/services/queue/lessonQueue";
import {
  createAudioTranscoder,
  createLocalMediaInspector,
} from "@electron/main/services/queue/media";
import { createQueueRepository } from "@electron/main/services/queue/repository";
import { createJobWorkspaceManager } from "@electron/main/services/queue/workspace";
import { createVideoFixture } from "@tests/helpers/media-fixtures";

const temporaryDirectories: string[] = [];

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function createLesson(id: number, name: string): LessonItem {
  return {
    id,
    name,
    createdAtOrder: id,
    audioStatus: "running",
    pipelineRuns: [],
  };
}

async function waitForJobStatus(
  resolveSnapshot: () => Promise<QueueJobSnapshot | null>,
  status: QueueJobSnapshot["status"],
): Promise<QueueJobSnapshot> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const snapshot = await resolveSnapshot();

    if (snapshot?.status === status) {
      return snapshot;
    }

    await delay(50);
  }

  throw new Error(`Queue job did not reach status ${status} in time.`);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => {
      return rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("lesson queue", () => {
  it("processes local-file and YouTube jobs sequentially", async () => {
    const directory = await mkdtemp(join(tmpdir(), "video2book-client-queue-"));
    temporaryDirectories.push(directory);

    const localAudioPath = join(directory, "local.mp3");
    const uploadOrder: string[] = [];

    await writeFile(localAudioPath, "local-audio", "utf8");

    const queue = createLessonQueue({
      queueRepository: createQueueRepository({
        statePath: join(directory, "queue", "state.json"),
      }),
      workspaceManager: createJobWorkspaceManager({
        jobsRootDir: join(directory, "queue", "jobs"),
      }),
      localMediaInspector: {
        inspect: vi.fn(async () => {
          return {
            canUploadDirectly: true,
            extension: ".mp3",
            hasAudio: true,
            hasVideo: false,
            sizeBytes: 11,
          };
        }),
      },
      audioTranscoder: {
        transcodeToMp3: vi.fn(async (_inputPath, outputPath) => outputPath),
      },
      youtubeDownloader: {
        downloadAudioToMp3: vi.fn(async (_sourceUrl, outputPath) => {
          await writeFile(outputPath, "youtube-audio", "utf8");
          return outputPath;
        }),
      },
      lessonUploader: {
        uploadAudio: vi.fn(async ({ lessonName }) => {
          uploadOrder.push(lessonName);
          await delay(30);
          return createLesson(uploadOrder.length, lessonName);
        }),
      },
      logger: silentLogger,
    });

    await queue.start();

    const localJob = await queue.enqueueLocalFile({
      filePath: localAudioPath,
      lessonName: "Локальный урок",
      projectId: 101,
    });
    const youtubeJob = await queue.enqueueYoutube({
      lessonName: "YouTube урок",
      projectId: 101,
      sourceUrl: "https://www.youtube.com/watch?v=test",
    });

    const completedLocalJob = await waitForJobStatus(async () => {
      return (await queue.getSnapshot(101)).jobs.find((job) => job.id === localJob.id) ?? null;
    }, "done");
    const completedYoutubeJob = await waitForJobStatus(async () => {
      return (await queue.getSnapshot(101)).jobs.find((job) => job.id === youtubeJob.id) ?? null;
    }, "done");

    expect(uploadOrder).toEqual(["Локальный урок", "YouTube урок"]);
    expect(completedLocalJob.createdLesson?.name).toBe("Локальный урок");
    expect(completedYoutubeJob.createdLesson?.name).toBe("YouTube урок");
  });

  it("resumes sync-stage jobs after restart without re-uploading", async () => {
    const directory = await mkdtemp(join(tmpdir(), "video2book-client-queue-"));
    temporaryDirectories.push(directory);

    const queueRepository = createQueueRepository({
      statePath: join(directory, "queue", "state.json"),
    });
    const workspaceManager = createJobWorkspaceManager({
      jobsRootDir: join(directory, "queue", "jobs"),
    });
    const jobId = "sync-job";
    const workspace = await workspaceManager.ensure(jobId);
    const createdAt = new Date().toISOString();
    const runningSyncJob: QueueJobSnapshot = {
      id: jobId,
      projectId: 101,
      lessonName: "Урок после sync",
      pipelineVersionId: null,
      kind: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=test",
      sourceFilePath: null,
      status: "running",
      stage: "sync",
      errorMessage: null,
      createdAt,
      updatedAt: createdAt,
      workspaceDir: workspace.workspaceDir,
      createdLesson: createLesson(77, "Урок после sync"),
    };

    await queueRepository.createJob(runningSyncJob);
    await workspaceManager.writeMeta(runningSyncJob);

    const lessonUploader = {
      uploadAudio: vi.fn(async () => createLesson(99, "unexpected")),
    };
    const queue = createLessonQueue({
      queueRepository,
      workspaceManager,
      localMediaInspector: {
        inspect: vi.fn(),
      },
      audioTranscoder: {
        transcodeToMp3: vi.fn(),
      },
      youtubeDownloader: {
        downloadAudioToMp3: vi.fn(),
      },
      lessonUploader,
      logger: silentLogger,
    });

    await queue.start();

    const completedJob = await waitForJobStatus(async () => {
      return (await queue.getSnapshot(101)).jobs.find((job) => job.id === jobId) ?? null;
    }, "done");

    expect(lessonUploader.uploadAudio).not.toHaveBeenCalled();
    expect(completedJob.createdLesson?.id).toBe(77);
  });

  it("transcodes local video before upload when direct upload is not possible", async () => {
    const directory = await mkdtemp(join(tmpdir(), "video2book-client-queue-"));
    temporaryDirectories.push(directory);

    const sourceBinaryPaths = await resolveSourceBinaryPaths({
      logger: silentLogger,
    });
    const videoFixturePath = join(directory, "local.mp4");
    const uploadedFiles: string[] = [];

    await createVideoFixture(sourceBinaryPaths.ffmpegPath, videoFixturePath);

    const queue = createLessonQueue({
      queueRepository: createQueueRepository({
        statePath: join(directory, "queue", "state.json"),
      }),
      workspaceManager: createJobWorkspaceManager({
        jobsRootDir: join(directory, "queue", "jobs"),
      }),
      localMediaInspector: createLocalMediaInspector({
        ffprobePath: sourceBinaryPaths.ffprobePath,
      }),
      audioTranscoder: createAudioTranscoder({
        ffmpegPath: sourceBinaryPaths.ffmpegPath,
      }),
      youtubeDownloader: {
        downloadAudioToMp3: vi.fn(),
      },
      lessonUploader: {
        uploadAudio: vi.fn(async ({ filePath, lessonName }) => {
          uploadedFiles.push(filePath);
          return createLesson(1, lessonName);
        }),
      },
      logger: silentLogger,
    });

    await queue.start();

    const job = await queue.enqueueLocalFile({
      filePath: videoFixturePath,
      lessonName: "Видео урок",
      projectId: 101,
    });

    const completedJob = await waitForJobStatus(async () => {
      return (await queue.getSnapshot(101)).jobs.find((candidate) => candidate.id === job.id) ?? null;
    }, "done");

    expect(uploadedFiles).toHaveLength(1);
    expect(uploadedFiles[0]).toMatch(/audio\.mp3$/);
    expect((await stat(uploadedFiles[0]!)).size).toBeGreaterThan(0);
    expect(completedJob.createdLesson?.name).toBe("Видео урок");
  });
});
