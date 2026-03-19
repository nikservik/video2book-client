import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { QueueJobSnapshot, QueueSnapshot } from "@electron/shared/dto/queue";

interface QueueState {
  jobs: QueueJobSnapshot[];
  version: 1;
}

type QueueStateUpdater<T> = (state: QueueState) => Promise<T> | T;

export interface QueueRepository {
  createJob(job: QueueJobSnapshot): Promise<QueueJobSnapshot>;
  getJob(jobId: string): Promise<QueueJobSnapshot | null>;
  getNextQueuedJob(): Promise<QueueJobSnapshot | null>;
  getSnapshot(projectId?: number): Promise<QueueSnapshot>;
  markRunningJobsQueued(): Promise<QueueJobSnapshot[]>;
  updateJob(
    jobId: string,
    updater: (job: QueueJobSnapshot) => QueueJobSnapshot,
  ): Promise<QueueJobSnapshot>;
}

export interface CreateQueueRepositoryOptions {
  statePath: string;
}

const INITIAL_QUEUE_STATE: QueueState = {
  version: 1,
  jobs: [],
};

async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  const temporaryPath = `${path}.tmp`;

  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  await rename(temporaryPath, path);
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function createQueueRepository(
  options: CreateQueueRepositoryOptions,
): QueueRepository {
  let cachedState: QueueState | null = null;
  let lock = Promise.resolve();

  async function ensureStateLoaded(): Promise<QueueState> {
    if (cachedState) {
      return cachedState;
    }

    try {
      const rawState = await readFile(options.statePath, "utf8");
      cachedState = JSON.parse(rawState) as QueueState;
    } catch {
      cachedState = cloneValue(INITIAL_QUEUE_STATE);
      await writeJsonAtomically(options.statePath, cachedState);
    }

    return cachedState;
  }

  async function withStateLock<T>(updater: QueueStateUpdater<T>): Promise<T> {
    const operation = lock.then(async () => {
      const state = await ensureStateLoaded();
      const result = await updater(state);

      await writeJsonAtomically(options.statePath, state);

      return cloneValue(result);
    });

    lock = operation.then(
      () => undefined,
      () => undefined,
    );

    return operation;
  }

  return {
    async createJob(job) {
      return withStateLock((state) => {
        state.jobs.push(cloneValue(job));
        return job;
      });
    },

    async getJob(jobId) {
      const state = await ensureStateLoaded();
      const job = state.jobs.find((candidate) => candidate.id === jobId) ?? null;

      return cloneValue(job);
    },

    async getNextQueuedJob() {
      const state = await ensureStateLoaded();
      const job = state.jobs.find((candidate) => candidate.status === "queued") ?? null;

      return cloneValue(job);
    },

    async getSnapshot(projectId) {
      const state = await ensureStateLoaded();
      const jobs = state.jobs.filter((job) => {
        return projectId === undefined ? true : job.projectId === projectId;
      });

      return {
        jobs: cloneValue(jobs),
      };
    },

    async markRunningJobsQueued() {
      return withStateLock((state) => {
        const now = new Date().toISOString();
        const recoveredJobs: QueueJobSnapshot[] = [];

        state.jobs = state.jobs.map((job) => {
          if (job.status !== "running") {
            return job;
          }

          const recoveredJob = {
            ...job,
            status: "queued" as const,
            updatedAt: now,
          };

          recoveredJobs.push(recoveredJob);

          return recoveredJob;
        });

        return recoveredJobs;
      });
    },

    async updateJob(jobId, updater) {
      return withStateLock((state) => {
        const jobIndex = state.jobs.findIndex((candidate) => candidate.id === jobId);

        if (jobIndex === -1) {
          throw new Error(`Queue job ${jobId} was not found.`);
        }

        const nextJob = updater(cloneValue(state.jobs[jobIndex]!));

        state.jobs.splice(jobIndex, 1, cloneValue(nextJob));

        return nextJob;
      });
    },
  };
}
