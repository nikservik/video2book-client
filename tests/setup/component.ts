import { afterEach, beforeEach, vi } from "vitest";
import { createProjectScreenDataMock, projectsListDataMock } from "@tests/fixtures/ui-data";

beforeEach(() => {
  window.electronAPI = {
    ping: vi.fn().mockResolvedValue("pong"),
    getRuntimeInfo: vi.fn().mockResolvedValue({
      appName: "Video2Book",
      platform: "darwin",
      versions: {
        chrome: "1.0.0",
        electron: "1.0.0",
        node: "22.0.0",
      },
    }),
    settings: {
      get: vi.fn().mockResolvedValue({
        hasToken: true,
      }),
      saveToken: vi.fn().mockResolvedValue({
        hasToken: true,
      }),
    },
    projects: {
      list: vi.fn().mockResolvedValue(projectsListDataMock),
      getLessons: vi.fn().mockImplementation(async (projectId: number) => {
        return createProjectScreenDataMock(projectId);
      }),
    },
    lessons: {
      enqueueLocalFile: vi.fn().mockResolvedValue({
        id: "queue-local-1",
        projectId: 201,
        lessonName: "Локальный урок",
        pipelineVersionId: null,
        kind: "local-file",
        sourceUrl: null,
        sourceFilePath: "/tmp/local.mp3",
        status: "queued",
        stage: null,
        errorMessage: null,
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:00.000Z",
        workspaceDir: "/tmp/queue-local-1",
        createdLesson: null,
      }),
      enqueueYoutube: vi.fn().mockResolvedValue({
        id: "queue-youtube-1",
        projectId: 201,
        lessonName: "YouTube урок",
        pipelineVersionId: null,
        kind: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=test",
        sourceFilePath: null,
        status: "queued",
        stage: null,
        errorMessage: null,
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:00.000Z",
        workspaceDir: "/tmp/queue-youtube-1",
        createdLesson: null,
      }),
      enqueueYoutubeBatch: vi.fn().mockResolvedValue([]),
    },
    queue: {
      getSnapshot: vi.fn().mockResolvedValue({
        jobs: [],
      }),
      onChanged: vi.fn().mockImplementation(() => {
        return () => {};
      }),
    },
    files: {
      getPathForFile: vi.fn().mockImplementation((file: File) => {
        return file.name ? `/tmp/${file.name}` : null;
      }),
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});
