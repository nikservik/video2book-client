import type { QueueJobSnapshot } from "@electron/shared/dto/queue";
import type { LessonAudioStatus, LessonItem } from "../types/ui";

function parseCreatedAtOrder(value: string, fallback: number): number {
  const parsedValue = Date.parse(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function createLocalLessonId(jobId: string): number {
  let hash = 0;

  for (const character of jobId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return -Math.max(1, Math.abs(hash));
}

function mapQueueAudioStatus(job: QueueJobSnapshot): LessonAudioStatus {
  if (job.status === "failed") {
    return "failed";
  }

  if (job.status === "done") {
    return "loaded";
  }

  if (job.status === "running") {
    return "running";
  }

  return "queued";
}

function mapQueueStatusLabel(job: QueueJobSnapshot): string {
  if (job.status === "failed") {
    return "Ошибка обработки";
  }

  if (job.status === "queued") {
    return "В очереди";
  }

  switch (job.stage) {
    case "download":
      return "Скачиваем аудио с YouTube";
    case "transcode":
      return "Преобразуем в MP3";
    case "upload":
      return "Загружаем аудио на сервер";
    case "sync":
      return "Синхронизируем урок";
    default:
      return "Обрабатываем урок";
  }
}

export function mapQueueJobToPlaceholderLesson(job: QueueJobSnapshot): LessonItem {
  return {
    id: createLocalLessonId(job.id),
    name: job.lessonName,
    createdAtOrder: parseCreatedAtOrder(job.createdAt, createLocalLessonId(job.id)),
    sourceUrl: job.sourceUrl ?? undefined,
    audioStatus: mapQueueAudioStatus(job),
    audioErrorTooltip: job.errorMessage ?? undefined,
    isPlaceholder: true,
    queueJobId: job.id,
    statusLabel: mapQueueStatusLabel(job),
    pipelineEmptyLabel: "Шаблоны появятся после создания урока",
    pipelineRuns: [],
  };
}

export function mergeProjectLessons(
  apiLessons: LessonItem[],
  queueJobs: QueueJobSnapshot[],
): LessonItem[] {
  const mergedLessons = [...apiLessons];
  const lessonIds = new Set(apiLessons.map((lesson) => lesson.id));
  const orderedQueueJobs = [...queueJobs].sort((left, right) => {
    return parseCreatedAtOrder(left.createdAt, 0) - parseCreatedAtOrder(right.createdAt, 0);
  });

  for (const job of orderedQueueJobs) {
    if (job.createdLesson) {
      if (!lessonIds.has(job.createdLesson.id)) {
        mergedLessons.push(job.createdLesson);
        lessonIds.add(job.createdLesson.id);
      }

      continue;
    }

    mergedLessons.push(mapQueueJobToPlaceholderLesson(job));
  }

  return mergedLessons;
}
