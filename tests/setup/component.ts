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
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});
