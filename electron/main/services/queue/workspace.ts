import { appendFile, copyFile, mkdir, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { QueueJobSnapshot } from "@electron/shared/dto/queue";

export interface JobWorkspacePaths {
  inputDirectory: string;
  metaPath: string;
  outputDirectory: string;
  preparedAudioPath: string;
  stderrLogPath: string;
  workspaceDir: string;
}

export interface JobWorkspaceManager {
  appendLog(jobId: string, message: string): Promise<void>;
  ensure(jobId: string): Promise<JobWorkspacePaths>;
  importLocalFile(jobId: string, sourceFilePath: string): Promise<string>;
  writeMeta(job: QueueJobSnapshot): Promise<void>;
}

export interface CreateJobWorkspaceManagerOptions {
  jobsRootDir: string;
}

async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  const temporaryPath = `${path}.tmp`;

  await writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  await rename(temporaryPath, path);
}

export function createJobWorkspaceManager(
  options: CreateJobWorkspaceManagerOptions,
): JobWorkspaceManager {
  function getPaths(jobId: string): JobWorkspacePaths {
    const workspaceDir = join(options.jobsRootDir, jobId);
    const inputDirectory = join(workspaceDir, "input");
    const outputDirectory = join(workspaceDir, "output");

    return {
      workspaceDir,
      inputDirectory,
      outputDirectory,
      preparedAudioPath: join(outputDirectory, "audio.mp3"),
      metaPath: join(workspaceDir, "meta.json"),
      stderrLogPath: join(workspaceDir, "stderr.log"),
    };
  }

  return {
    async appendLog(jobId, message) {
      const paths = await this.ensure(jobId);

      await appendFile(paths.stderrLogPath, `${message}\n`, "utf8");
    },

    async ensure(jobId) {
      const paths = getPaths(jobId);

      await mkdir(paths.inputDirectory, { recursive: true });
      await mkdir(paths.outputDirectory, { recursive: true });

      return paths;
    },

    async importLocalFile(jobId, sourceFilePath) {
      const paths = await this.ensure(jobId);
      const destinationPath = join(paths.inputDirectory, basename(sourceFilePath));

      await copyFile(sourceFilePath, destinationPath);

      return destinationPath;
    },

    async writeMeta(job) {
      const paths = await this.ensure(job.id);

      await writeJsonAtomically(paths.metaPath, job);
    },
  };
}
