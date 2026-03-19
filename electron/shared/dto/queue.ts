import type { LessonItem } from "../../../src/types/ui";

export const QUEUE_CHANGED_EVENT = "queue:changed";

export type QueueJobKind = "youtube" | "local-file";
export type QueueJobStatus = "queued" | "running" | "failed" | "done";
export type QueueJobStage = "download" | "transcode" | "upload" | "sync" | null;

export interface QueueJobSnapshot {
  id: string;
  projectId: number;
  lessonName: string;
  pipelineVersionId: number | null;
  kind: QueueJobKind;
  sourceUrl: string | null;
  sourceFilePath: string | null;
  status: QueueJobStatus;
  stage: QueueJobStage;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceDir: string;
  createdLesson: LessonItem | null;
}

export interface QueueSnapshot {
  jobs: QueueJobSnapshot[];
}

export interface EnqueueYoutubeLessonInput {
  lessonName: string;
  pipelineVersionId: number | null;
  projectId: number;
  sourceUrl: string;
}

export interface EnqueueYoutubeBatchItemInput {
  lessonName: string;
  sourceUrl: string;
}

export interface EnqueueYoutubeBatchInput {
  items: EnqueueYoutubeBatchItemInput[];
  pipelineVersionId: number | null;
  projectId: number;
}

export interface EnqueueLocalFileLessonInput {
  filePath: string;
  lessonName: string;
  pipelineVersionId: number | null;
  projectId: number;
}
