import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { EventEmitter } from "node:events";
import type {
  QueueJobSnapshot,
  QueueJobStage,
  QueueSnapshot,
} from "@electron/shared/dto/queue";
import type {
  AudioTranscoder,
  LessonUploader,
  LocalMediaInspector,
  YoutubeDownloader,
} from "./media";
import type { JobWorkspaceManager } from "./workspace";
import type { QueueRepository } from "./repository";

const MAX_AUDIO_FILE_SIZE_BYTES = 500 * 1024 * 1024;

type Logger = Pick<Console, "error" | "info" | "warn">;

export interface EnqueueLocalFileJobInput {
  filePath: string;
  lessonName: string;
  pipelineVersionId?: number | null;
  projectId: number;
}

export interface EnqueueYoutubeJobInput {
  lessonName: string;
  pipelineVersionId?: number | null;
  projectId: number;
  sourceUrl: string;
}

export interface LessonQueueOptions {
  audioTranscoder: AudioTranscoder;
  lessonUploader: LessonUploader;
  localMediaInspector: LocalMediaInspector;
  logger?: Logger;
  queueRepository: QueueRepository;
  workspaceManager: JobWorkspaceManager;
  youtubeDownloader: YoutubeDownloader;
}

export interface LessonQueue {
  enqueueLocalFile(input: EnqueueLocalFileJobInput): Promise<QueueJobSnapshot>;
  enqueueYoutube(input: EnqueueYoutubeJobInput): Promise<QueueJobSnapshot>;
  enqueueYoutubeBatch(inputs: EnqueueYoutubeJobInput[]): Promise<QueueJobSnapshot[]>;
  getSnapshot(projectId?: number): Promise<QueueSnapshot>;
  onChanged(listener: (snapshot: QueueSnapshot) => void): () => void;
  start(): Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function ensureAudioSizeWithinLimit(filePath: string): Promise<void> {
  const fileStats = await stat(filePath);

  if (fileStats.size > MAX_AUDIO_FILE_SIZE_BYTES) {
    throw new Error("Подготовленный аудиофайл превышает лимит 500 MB.");
  }
}

export function createLessonQueue(options: LessonQueueOptions): LessonQueue {
  const logger = options.logger ?? console;
  const events = new EventEmitter();
  let started = false;
  let processingJob = false;

  async function notifyChanged(): Promise<void> {
    events.emit("changed", await options.queueRepository.getSnapshot());
  }

  async function cleanupCompletedArtifacts(jobId: string): Promise<void> {
    try {
      await options.workspaceManager.cleanupCompletedArtifacts(jobId);
    } catch (error) {
      logger.warn(
        `Failed to cleanup completed job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async function persistJob(job: QueueJobSnapshot): Promise<QueueJobSnapshot> {
    await options.workspaceManager.writeMeta(job);
    await notifyChanged();
    return job;
  }

  async function updateJob(
    jobId: string,
    updater: (job: QueueJobSnapshot) => QueueJobSnapshot,
  ): Promise<QueueJobSnapshot> {
    const job = await options.queueRepository.updateJob(jobId, updater);
    return persistJob(job);
  }

  async function failJob(job: QueueJobSnapshot, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : "Не удалось обработать задачу.";

    await options.workspaceManager.appendLog(job.id, `ERROR: ${message}`);
    await updateJob(job.id, (currentJob) => ({
      ...currentJob,
      status: "failed",
      stage: null,
      errorMessage: message,
      updatedAt: nowIso(),
    }));
  }

  async function prepareYoutubeAudio(job: QueueJobSnapshot): Promise<string> {
    if (!job.sourceUrl) {
      throw new Error("Для YouTube-задачи не задан source URL.");
    }

    const workspace = await options.workspaceManager.ensure(job.id);

    await updateJob(job.id, (currentJob) => ({
      ...currentJob,
      status: "running",
      stage: "download",
      errorMessage: null,
      updatedAt: nowIso(),
    }));

    return options.youtubeDownloader.downloadAudioToMp3(
      job.sourceUrl,
      workspace.preparedAudioPath,
      workspace.stderrLogPath,
    );
  }

  async function prepareLocalAudio(job: QueueJobSnapshot): Promise<string> {
    if (!job.sourceFilePath) {
      throw new Error("Для локальной задачи не задан путь к файлу.");
    }

    const workspace = await options.workspaceManager.ensure(job.id);
    const inspection = await options.localMediaInspector.inspect(
      job.sourceFilePath,
      workspace.stderrLogPath,
    );

    if (!inspection.hasAudio) {
      throw new Error("В выбранном файле не найден аудиопоток.");
    }

    if (inspection.canUploadDirectly) {
      return job.sourceFilePath;
    }

    await updateJob(job.id, (currentJob) => ({
      ...currentJob,
      status: "running",
      stage: "transcode",
      errorMessage: null,
      updatedAt: nowIso(),
    }));

    return options.audioTranscoder.transcodeToMp3(
      job.sourceFilePath,
      workspace.preparedAudioPath,
      workspace.stderrLogPath,
    );
  }

  async function processJob(job: QueueJobSnapshot): Promise<void> {
    try {
      if (job.createdLesson && job.stage === "sync") {
        await updateJob(job.id, (currentJob) => ({
          ...currentJob,
          status: "done",
          stage: null,
          errorMessage: null,
          updatedAt: nowIso(),
        }));

        return;
      }

      const preparedAudioPath =
        job.kind === "youtube"
          ? await prepareYoutubeAudio(job)
          : await prepareLocalAudio(job);

      await ensureAudioSizeWithinLimit(preparedAudioPath);

      await updateJob(job.id, (currentJob) => ({
        ...currentJob,
        status: "running",
        stage: "upload",
        errorMessage: null,
        updatedAt: nowIso(),
      }));

      const createdLesson = await options.lessonUploader.uploadAudio({
        filePath: preparedAudioPath,
        lessonName: job.lessonName,
        pipelineVersionId: job.pipelineVersionId,
        projectId: job.projectId,
        sourceUrl: job.kind === "youtube" ? job.sourceUrl : null,
      });

      await updateJob(job.id, (currentJob) => ({
        ...currentJob,
        createdLesson,
        status: "running",
        stage: "sync",
        errorMessage: null,
        updatedAt: nowIso(),
      }));

      await updateJob(job.id, (currentJob) => ({
        ...currentJob,
        status: "done",
        stage: null,
        errorMessage: null,
        updatedAt: nowIso(),
      }));

      await cleanupCompletedArtifacts(job.id);
    } catch (error) {
      await failJob(job, error);
    }
  }

  async function processNextJobs(): Promise<void> {
    if (!started || processingJob) {
      return;
    }

    processingJob = true;

    try {
      while (started) {
        const nextJob = await options.queueRepository.getNextQueuedJob();

        if (!nextJob) {
          return;
        }

        await processJob(nextJob);
      }
    } finally {
      processingJob = false;
    }
  }

  async function enqueueJob(
    input:
      | ({ kind: "local-file"; sourceFilePath: string } & Omit<
          EnqueueLocalFileJobInput,
          "filePath"
        >)
      | ({ kind: "youtube"; sourceUrl: string } & EnqueueYoutubeJobInput),
  ): Promise<QueueJobSnapshot> {
    const id = randomUUID();
    const workspace = await options.workspaceManager.ensure(id);
    const createdAt = nowIso();
    const stage: QueueJobStage = null;
    const persistedSourceFilePath =
      input.kind === "local-file"
        ? await options.workspaceManager.importLocalFile(id, input.sourceFilePath)
        : null;
    const job: QueueJobSnapshot = {
      id,
      projectId: input.projectId,
      lessonName: input.lessonName,
      pipelineVersionId: input.pipelineVersionId ?? null,
      kind: input.kind,
      sourceUrl: input.kind === "youtube" ? input.sourceUrl : null,
      sourceFilePath: persistedSourceFilePath,
      status: "queued",
      stage,
      errorMessage: null,
      createdAt,
      updatedAt: createdAt,
      workspaceDir: workspace.workspaceDir,
      createdLesson: null,
    };

    await options.queueRepository.createJob(job);
    await persistJob(job);
    void processNextJobs();

    return job;
  }

  return {
    async enqueueLocalFile(input) {
      return enqueueJob({
        kind: "local-file",
        projectId: input.projectId,
        lessonName: input.lessonName,
        pipelineVersionId: input.pipelineVersionId,
        sourceFilePath: input.filePath,
      });
    },

    async enqueueYoutube(input) {
      return enqueueJob({
        kind: "youtube",
        projectId: input.projectId,
        lessonName: input.lessonName,
        pipelineVersionId: input.pipelineVersionId,
        sourceUrl: input.sourceUrl,
      });
    },

    async enqueueYoutubeBatch(inputs) {
      const jobs: QueueJobSnapshot[] = [];

      for (const input of inputs) {
        jobs.push(await this.enqueueYoutube(input));
      }

      return jobs;
    },

    async getSnapshot(projectId) {
      return options.queueRepository.getSnapshot(projectId);
    },

    onChanged(listener) {
      events.on("changed", listener);

      return () => {
        events.off("changed", listener);
      };
    },

    async start() {
      if (started) {
        return;
      }

      started = true;

      const recoveredJobs = await options.queueRepository.markRunningJobsQueued();
      const snapshot = await options.queueRepository.getSnapshot();
      const activeJobIds = snapshot.jobs.map((job) => job.id);

      await options.workspaceManager.cleanupOrphanedWorkspaces(activeJobIds);

      await Promise.all(
        snapshot.jobs
          .filter((job) => job.status === "done")
          .map((job) => cleanupCompletedArtifacts(job.id)),
      );

      if (recoveredJobs.length > 0) {
        logger.warn(
          `Recovered ${recoveredJobs.length} queue job(s) after an unexpected shutdown.`,
        );

        for (const recoveredJob of recoveredJobs) {
          await persistJob(recoveredJob);
        }
      }

      void processNextJobs();
    },
  };
}
