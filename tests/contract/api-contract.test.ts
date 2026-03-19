import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiClient } from "@electron/main/services/api/apiClient";
import {
  mapCreatedLessonResponse,
  mapFoldersResponse,
  mapProjectLessonsResponse,
} from "@electron/main/services/api/mappers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..", "..");
const prismPort = 4010;
const prismBaseUrl = `http://127.0.0.1:${prismPort}`;

let prismProcess: ChildProcess | null = null;
let prismOutput = "";

async function waitForPrismServer(): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${prismBaseUrl}/api/folders`, {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer test-token",
        },
      });

      if (response.ok) {
        return;
      }
    } catch {
      // noop, Prism is still starting.
    }

    await delay(250);
  }

  throw new Error(`Prism mock server did not start in time.\n${prismOutput}`);
}

beforeAll(async () => {
  prismProcess = spawn(
    "pnpm",
    [
      "exec",
      "prism",
      "mock",
      "docs/client-api.yaml",
      "--host",
      "127.0.0.1",
      "--port",
      String(prismPort),
    ],
    {
      cwd: projectRoot,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  prismProcess.stdout?.on("data", (chunk) => {
    prismOutput += chunk.toString();
  });
  prismProcess.stderr?.on("data", (chunk) => {
    prismOutput += chunk.toString();
  });

  await waitForPrismServer();
}, 20_000);

afterAll(async () => {
  if (!prismProcess) {
    return;
  }

  prismProcess.kill("SIGTERM");
  await delay(200);
}, 5_000);

describe("OpenAPI contract", () => {
  it("loads and maps folders from the Prism mock server", async () => {
    const apiClient = createApiClient({
      accessToken: "test-token",
      baseUrl: prismBaseUrl,
    });

    const response = await apiClient.listFolders();
    const folders = mapFoldersResponse(response);

    expect(folders[0]?.name).toBe("Курсы");
    expect(folders[0]?.projects[0]?.name).toBe("История кино");
  });

  it("loads and maps project screen data from the Prism mock server", async () => {
    const apiClient = createApiClient({
      accessToken: "test-token",
      baseUrl: prismBaseUrl,
    });

    const response = await apiClient.listProjectLessons(101);
    const screenData = mapProjectLessonsResponse(response);

    expect(screenData.project.name).toBe("История кино");
    expect(screenData.pipelineVersions[0]?.label).toBe("Базовый шаблон • v3");
    expect(screenData.project.lessons[0]?.sourceUrl).toBe(
      "https://www.youtube.com/watch?v=abc123",
    );
  });

  it("posts multipart audio data and maps the created lesson response", async () => {
    const apiClient = createApiClient({
      accessToken: "test-token",
      baseUrl: prismBaseUrl,
    });

    const response = await apiClient.createProjectLessonFromAudio({
      projectId: 101,
      name: "Новая лекция",
      file: new Blob(["audio-data"], { type: "audio/mpeg" }),
      filename: "lesson.mp3",
      pipelineVersionId: 7,
      sourceUrl: "https://www.youtube.com/watch?v=uploaded-audio-source",
    });
    const lesson = mapCreatedLessonResponse(response);

    expect(lesson.name).toBe("Новая лекция");
    expect(lesson.audioStatus).toBe("running");
    expect(lesson.sourceUrl).toBe("https://www.youtube.com/watch?v=uploaded-audio-source");
    expect(lesson.pipelineRuns[0]?.versionLabel).toBe("v3");
  });
});
