import { BrowserWindow, ipcMain } from "electron";
import type {
  EnqueueLocalFileLessonInput,
  EnqueueYoutubeBatchInput,
  EnqueueYoutubeLessonInput,
  QueueSnapshot,
} from "@electron/shared/dto/queue";
import { QUEUE_CHANGED_EVENT } from "@electron/shared/dto/queue";
import type { LessonQueue } from "../services/queue/lessonQueue";

const LESSONS_ENQUEUE_LOCAL_FILE_CHANNEL = "lessons:enqueueLocalFile";
const LESSONS_ENQUEUE_YOUTUBE_CHANNEL = "lessons:enqueueYoutube";
const LESSONS_ENQUEUE_YOUTUBE_BATCH_CHANNEL = "lessons:enqueueYoutubeBatch";
const QUEUE_GET_SNAPSHOT_CHANNEL = "queue:getSnapshot";

let unsubscribeQueueEvents: (() => void) | null = null;

export interface RegisterLessonQueueIpcOptions {
  lessonQueue: LessonQueue;
}

function emitQueueSnapshot(snapshot: QueueSnapshot): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(QUEUE_CHANGED_EVENT, snapshot);
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось поставить урок в очередь.";
}

function assertNonEmptyString(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} не может быть пустым.`);
  }
}

function validateYoutubeInput(input: EnqueueYoutubeLessonInput): void {
  assertNonEmptyString(input.lessonName, "Название урока");
  assertNonEmptyString(input.sourceUrl, "Ссылка на YouTube");
}

function validateLocalFileInput(input: EnqueueLocalFileLessonInput): void {
  assertNonEmptyString(input.lessonName, "Название урока");
  assertNonEmptyString(input.filePath, "Путь к файлу");
}

function validateBatchInput(input: EnqueueYoutubeBatchInput): void {
  if (input.items.length === 0) {
    throw new Error("Список уроков не может быть пустым.");
  }

  for (const item of input.items) {
    assertNonEmptyString(item.lessonName, "Название урока");
    assertNonEmptyString(item.sourceUrl, "Ссылка на YouTube");
  }
}

export function registerLessonQueueIpcHandlers(
  options: RegisterLessonQueueIpcOptions,
): void {
  ipcMain.removeHandler(LESSONS_ENQUEUE_LOCAL_FILE_CHANNEL);
  ipcMain.removeHandler(LESSONS_ENQUEUE_YOUTUBE_CHANNEL);
  ipcMain.removeHandler(LESSONS_ENQUEUE_YOUTUBE_BATCH_CHANNEL);
  ipcMain.removeHandler(QUEUE_GET_SNAPSHOT_CHANNEL);

  unsubscribeQueueEvents?.();
  unsubscribeQueueEvents = options.lessonQueue.onChanged(emitQueueSnapshot);

  ipcMain.handle(LESSONS_ENQUEUE_LOCAL_FILE_CHANNEL, async (_event, input: EnqueueLocalFileLessonInput) => {
    try {
      validateLocalFileInput(input);

      return await options.lessonQueue.enqueueLocalFile(input);
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  });

  ipcMain.handle(LESSONS_ENQUEUE_YOUTUBE_CHANNEL, async (_event, input: EnqueueYoutubeLessonInput) => {
    try {
      validateYoutubeInput(input);

      return await options.lessonQueue.enqueueYoutube(input);
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  });

  ipcMain.handle(
    LESSONS_ENQUEUE_YOUTUBE_BATCH_CHANNEL,
    async (_event, input: EnqueueYoutubeBatchInput) => {
      try {
        validateBatchInput(input);

        return await options.lessonQueue.enqueueYoutubeBatch(
          input.items.map((item) => ({
            projectId: input.projectId,
            lessonName: item.lessonName,
            pipelineVersionId: input.pipelineVersionId,
            sourceUrl: item.sourceUrl,
          })),
        );
      } catch (error) {
        throw new Error(toErrorMessage(error));
      }
    },
  );

  ipcMain.handle(QUEUE_GET_SNAPSHOT_CHANNEL, async (_event, projectId?: number) => {
    try {
      return await options.lessonQueue.getSnapshot(projectId);
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  });
}
