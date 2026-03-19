import { describe, expect, it } from "vitest";
import type { QueueJobSnapshot } from "@electron/shared/dto/queue";
import type { LessonItem } from "@/types/ui";
import {
  mapQueueJobToPlaceholderLesson,
  mergeProjectLessons,
} from "@/utils/projectLessonsMerge";

function createLesson(id: number, name: string): LessonItem {
  return {
    id,
    name,
    createdAtOrder: id,
    audioStatus: "loaded",
    pipelineRuns: [],
  };
}

function createQueueJob(overrides: Partial<QueueJobSnapshot> = {}): QueueJobSnapshot {
  return {
    id: "queue-job-1",
    projectId: 101,
    lessonName: "Новый локальный урок",
    pipelineVersionId: null,
    kind: "local-file",
    sourceUrl: null,
    sourceFilePath: "/tmp/local.mp3",
    status: "queued",
    stage: null,
    errorMessage: null,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    workspaceDir: "/tmp/queue-job-1",
    createdLesson: null,
    ...overrides,
  };
}

describe("project lessons merge", () => {
  it("maps queue jobs to placeholder lessons with user-facing status", () => {
    const placeholderLesson = mapQueueJobToPlaceholderLesson(
      createQueueJob({
        status: "running",
        stage: "upload",
        sourceUrl: "https://youtu.be/test",
      }),
    );

    expect(placeholderLesson.id).toBeLessThan(0);
    expect(placeholderLesson.isPlaceholder).toBe(true);
    expect(placeholderLesson.sourceUrl).toBe("https://youtu.be/test");
    expect(placeholderLesson.audioStatus).toBe("running");
    expect(placeholderLesson.statusLabel).toBe("Загружаем аудио на сервер");
    expect(placeholderLesson.pipelineEmptyLabel).toBe(
      "Шаблоны появятся после создания урока",
    );
  });

  it("merges queued placeholders and created lessons without duplicating API lessons", () => {
    const apiLessons = [createLesson(1, "Урок из API")];
    const createdLesson = createLesson(77, "Созданный урок");
    const mergedLessons = mergeProjectLessons(apiLessons, [
      createQueueJob(),
      createQueueJob({
        id: "queue-job-2",
        lessonName: createdLesson.name,
        status: "done",
        createdAt: "2026-03-19T00:00:01.000Z",
        updatedAt: "2026-03-19T00:00:01.000Z",
        createdLesson,
      }),
      createQueueJob({
        id: "queue-job-3",
        lessonName: "Дубликат API урока",
        status: "done",
        createdAt: "2026-03-19T00:00:02.000Z",
        updatedAt: "2026-03-19T00:00:02.000Z",
        createdLesson: apiLessons[0],
      }),
    ]);

    expect(mergedLessons.map((lesson) => lesson.name)).toEqual([
      "Урок из API",
      "Новый локальный урок",
      "Созданный урок",
    ]);
    expect(mergedLessons.filter((lesson) => lesson.id === 1)).toHaveLength(1);
  });
});
