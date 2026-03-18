import { afterEach, beforeEach, vi } from "vitest";

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
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});
