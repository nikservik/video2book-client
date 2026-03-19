import { describe, expect, it } from "vitest";
import type { components } from "@electron/shared/api/schema";
import {
  mapCreatedLessonResponse,
  mapFoldersResponse,
  mapProjectLessonsResponse,
} from "@electron/main/services/api/mappers";

describe("API mappers", () => {
  it("maps folders and projects into renderer DTOs", () => {
    const response: components["schemas"]["FoldersResponse"] = {
      data: [
        {
          id: 12,
          name: "Курсы",
          hidden: false,
          projects_count: 1,
          projects: [
            {
              id: 101,
              folder_id: 12,
              name: "История кино",
              lessons_count: 8,
              duration_seconds: null,
              duration_label: null,
              default_pipeline_version_id: 7,
              referer: null,
              updated_at: "2026-03-18T09:15:00+00:00",
            },
          ],
        },
      ],
    };

    const folders = mapFoldersResponse(response);

    expect(folders).toEqual([
      {
        id: 12,
        name: "Курсы",
        projectsCount: 1,
        isOpen: true,
        isHidden: undefined,
        projects: [
          {
            id: 101,
            name: "История кино",
            lessonsCount: 8,
            durationLabel: "—",
            to: "/projects/101",
          },
        ],
      },
    ]);
  });

  it("maps project screen data and preserves source links", () => {
    const response: components["schemas"]["ProjectLessonsResponse"] = {
      data: {
        project: {
          id: 101,
          folder_id: 12,
          name: "История кино",
          lessons_count: 2,
          duration_seconds: 5400,
          duration_label: "1ч 30м",
          default_pipeline_version_id: 7,
          referer: null,
          updated_at: "2026-03-18T09:15:00+00:00",
        },
        pipeline_versions: [
          {
            id: 7,
            label: "Базовый шаблон • v3",
            description: "Базовая обработка лекции",
          },
        ],
        lessons: [
          {
            id: 501,
            project_id: 101,
            name: "Введение",
            source_filename: "lessons/501.mp3",
            source_url: "https://www.youtube.com/watch?v=abc123",
            audio_duration_seconds: 1800,
            audio_duration_label: "30м",
            download_status: "loaded",
            runs: [
              {
                id: 9001,
                lesson_id: 501,
                status: "done",
                pipeline_version_id: 7,
                pipeline_title: "Базовый шаблон",
                pipeline_version: 3,
                pipeline_label: "Базовый шаблон • v3",
                steps_count: 3,
                done_steps_count: 3,
                created_at: "2026-03-18T08:00:00+00:00",
              },
            ],
          },
        ],
      },
    };

    const screenData = mapProjectLessonsResponse(response);

    expect(screenData.parentFolderId).toBe(12);
    expect(screenData.pipelineVersions[0]).toEqual({
      id: 7,
      label: "Базовый шаблон • v3",
      description: "Базовая обработка лекции",
    });
    expect(screenData.project.name).toBe("История кино");
    expect(screenData.project.lessons[0]).toMatchObject({
      id: 501,
      name: "Введение",
      sourceUrl: "https://www.youtube.com/watch?v=abc123",
      audioStatus: "loaded",
      audioDurationLabel: "30м",
    });
    expect(screenData.project.lessons[0]?.pipelineRuns[0]).toEqual({
      id: 9001,
      title: "Базовый шаблон",
      versionLabel: "v3",
      status: "done",
    });
  });

  it("maps created lesson responses to UI lesson items", () => {
    const response: components["schemas"]["ProjectLessonCreateResponse"] = {
      data: {
        project: {
          id: 101,
          folder_id: 12,
          name: "История кино",
          lessons_count: 9,
          duration_seconds: 14400,
          duration_label: "4ч 0м",
          default_pipeline_version_id: 7,
          referer: null,
          updated_at: "2026-03-18T09:25:00+00:00",
        },
        lesson: {
          id: 503,
          project_id: 101,
          name: "Новая лекция",
          source_filename: null,
          source_url: null,
          audio_duration_seconds: null,
          audio_duration_label: null,
          download_status: "running",
          runs: [
            {
              id: 9003,
              lesson_id: 503,
              status: "queued",
              pipeline_version_id: 7,
              pipeline_title: "Базовый шаблон",
              pipeline_version: 3,
              pipeline_label: "Базовый шаблон • v3",
              steps_count: 3,
              done_steps_count: 0,
              created_at: "2026-03-18T09:25:00+00:00",
            },
          ],
        },
      },
    };

    const lesson = mapCreatedLessonResponse(response);

    expect(lesson).toMatchObject({
      id: 503,
      name: "Новая лекция",
      audioStatus: "running",
      sourceUrl: undefined,
    });
    expect(lesson.pipelineRuns[0]).toEqual({
      id: 9003,
      title: "Базовый шаблон",
      versionLabel: "v3",
      status: "queued",
    });
  });
});
