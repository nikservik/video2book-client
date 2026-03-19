import { expect, test } from "@playwright/test";
import { _electron as electron } from "playwright";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import type { QueueSnapshot } from "@electron/shared/dto/queue";
import { resolveSourceBinaryPaths } from "@electron/main/services/binaries/prepareBinaries";
import { createMp3Fixture } from "@tests/helpers/media-fixtures";
import { startStatefulApiServer, type StatefulApiServer } from "./helpers/stateful-api-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..", "..");
const serverPort = 4011;
const E2E_POLL_ATTEMPTS = 200;
const E2E_POLL_INTERVAL_MS = 100;

let fixtureDirectory = "";
let localAudioFixturePath = "";
let youtubeAudioFixturePath = "";

async function createUserDataPath(hasToken: boolean): Promise<string> {
  const userDataPath = await mkdtemp(join(tmpdir(), "video2book-client-e2e-"));

  if (hasToken) {
    await writeFile(
      join(userDataPath, "config.json"),
      JSON.stringify(
        {
          accessTokenPlaintext: "test-token",
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  return userDataPath;
}

async function launchApp(
  apiServer: StatefulApiServer,
  options: { hasToken?: boolean } = {},
) {
  const userDataPath = await createUserDataPath(options.hasToken ?? true);
  const app = await electron.launch({
    args: [resolve(projectRoot, "dist-electron/main/index.js")],
    cwd: projectRoot,
    env: {
      ...process.env,
      VIDEO2BOOK_API_BASE_URL: apiServer.baseUrl,
      VIDEO2BOOK_FAKE_YOUTUBE_AUDIO_PATH: youtubeAudioFixturePath,
      VIDEO2BOOK_USER_DATA_PATH: userDataPath,
    },
  });
  const firstWindow = await app.firstWindow();

  return {
    app,
    firstWindow,
    userDataPath,
  };
}

async function readQueueSnapshot(userDataPath: string): Promise<QueueSnapshot | null> {
  try {
    return JSON.parse(
      await readFile(join(userDataPath, "queue", "state.json"), "utf8"),
    ) as QueueSnapshot;
  } catch {
    return null;
  }
}

async function waitForQueueJob(
  userDataPath: string,
  predicate: (job: QueueSnapshot["jobs"][number]) => boolean,
) {
  for (let attempt = 0; attempt < E2E_POLL_ATTEMPTS; attempt += 1) {
    const snapshot = await readQueueSnapshot(userDataPath);
    const matchingJob = snapshot?.jobs.find(predicate);

    if (matchingJob) {
      return matchingJob;
    }

    await delay(E2E_POLL_INTERVAL_MS);
  }

  throw new Error("Queue job did not appear in state.json in time.");
}

async function waitForQueueJobStatus(
  userDataPath: string,
  jobId: string,
  expectedStatus: QueueSnapshot["jobs"][number]["status"],
) {
  for (let attempt = 0; attempt < E2E_POLL_ATTEMPTS; attempt += 1) {
    const snapshot = await readQueueSnapshot(userDataPath);
    const job = snapshot?.jobs.find((item) => item.id === jobId);

    if (job?.status === expectedStatus) {
      return job;
    }

    if (job?.status === "failed" && expectedStatus !== "failed") {
      throw new Error(
        `Queue job ${jobId} failed: ${job.errorMessage ?? "unknown error"}.`,
      );
    }

    await delay(E2E_POLL_INTERVAL_MS);
  }

  throw new Error(`Queue job ${jobId} did not reach status ${expectedStatus} in time.`);
}

async function waitForProjectLessonsCount(
  apiServer: StatefulApiServer,
  projectId: number,
  expectedCount: number,
): Promise<void> {
  for (let attempt = 0; attempt < E2E_POLL_ATTEMPTS; attempt += 1) {
    if ((apiServer.state.projects[projectId]?.lessons.length ?? 0) === expectedCount) {
      return;
    }

    await delay(E2E_POLL_INTERVAL_MS);
  }

  throw new Error(`Project ${projectId} did not reach ${expectedCount} lessons in time.`);
}

async function clickProject(firstWindow: Awaited<ReturnType<typeof launchApp>>["firstWindow"]) {
  await firstWindow.getByText("История кино").click();
  await expect(
    firstWindow.getByRole("heading", { name: "История кино" }),
  ).toBeVisible();
}

test.beforeAll(async () => {
  fixtureDirectory = await mkdtemp(join(tmpdir(), "video2book-client-e2e-media-"));

  const binaryPaths = await resolveSourceBinaryPaths();

  localAudioFixturePath = join(fixtureDirectory, "local.mp3");
  youtubeAudioFixturePath = join(fixtureDirectory, "youtube.mp3");

  await createMp3Fixture(binaryPaths.ffmpegPath, localAudioFixturePath);
  await createMp3Fixture(binaryPaths.ffmpegPath, youtubeAudioFixturePath);
});

test.afterAll(async () => {
  if (fixtureDirectory) {
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
});

test("shows projects list and project screen", async () => {
  const apiServer = await startStatefulApiServer(serverPort);
  const { app, firstWindow, userDataPath } = await launchApp(apiServer);

  try {
    await expect(firstWindow.getByText("Курсы")).toBeVisible();
    await expect(firstWindow.getByText("История кино")).toBeVisible();

    await clickProject(firstWindow);
    await expect(
      firstWindow.getByRole("button", { name: "Добавить урок", exact: true }),
    ).toBeVisible();
  } finally {
    await app.close();
    await apiServer.close();
    await rm(userDataPath, { recursive: true, force: true });
  }
});

test("returns to the projects page with the current folder reopened", async () => {
  const apiServer = await startStatefulApiServer(serverPort);
  const { app, firstWindow, userDataPath } = await launchApp(apiServer);

  try {
    await clickProject(firstWindow);
    await firstWindow.getByRole("link", { name: "Проекты" }).click();

    await expect(firstWindow.getByText("История кино")).toBeVisible();
    await expect(firstWindow.getByText("Теория монтажа")).toBeVisible();
  } finally {
    await app.close();
    await apiServer.close();
    await rm(userDataPath, { recursive: true, force: true });
  }
});

test("opens the token modal automatically on first launch without a saved token", async () => {
  const apiServer = await startStatefulApiServer(serverPort);
  const { app, firstWindow, userDataPath } = await launchApp(apiServer, {
    hasToken: false,
  });

  try {
    await expect(firstWindow.getByRole("heading", { name: "Введите токен доступа" })).toBeVisible();
    await expect(firstWindow.getByLabel("Token")).toBeVisible();
  } finally {
    await app.close();
    await apiServer.close();
    await rm(userDataPath, { recursive: true, force: true });
  }
});

test("enqueues a YouTube lesson from the create modal", async () => {
  const apiServer = await startStatefulApiServer(serverPort);
  const { app, firstWindow, userDataPath } = await launchApp(apiServer);

  try {
    await clickProject(firstWindow);

    await firstWindow.getByRole("button", { name: "Добавить урок", exact: true }).click();
    const dialog = firstWindow.getByRole("dialog");

    await dialog.getByLabel("Название урока").fill("Новый YouTube урок");
    await dialog.getByLabel("Ссылка на YouTube").fill("https://youtu.be/new-youtube-lesson");
    await dialog.getByRole("button", { name: "Сохранить" }).click();

    await expect(firstWindow.getByRole("heading", { name: "Добавить урок" })).toHaveCount(0);

    const queueJob = await waitForQueueJob(userDataPath, (job) => {
      return job.lessonName === "Новый YouTube урок";
    });

    expect(queueJob.kind).toBe("youtube");
    expect(queueJob.sourceUrl).toBe("https://youtu.be/new-youtube-lesson");

    await waitForQueueJobStatus(userDataPath, queueJob.id, "done");
    await waitForProjectLessonsCount(apiServer, 101, 3);
  } finally {
    await app.close();
    await apiServer.close();
    await rm(userDataPath, { recursive: true, force: true });
  }
});

test("shows a placeholder lesson immediately after enqueue before API refresh completes", async () => {
  const apiServer = await startStatefulApiServer(serverPort, {
    postResponseDelayMs: 1200,
  });
  const { app, firstWindow, userDataPath } = await launchApp(apiServer);

  try {
    await clickProject(firstWindow);

    await firstWindow.getByRole("button", { name: "Добавить урок", exact: true }).click();
    const dialog = firstWindow.getByRole("dialog");

    await dialog.getByLabel("Название урока").fill("Placeholder урок");
    await dialog.getByLabel("Ссылка на YouTube").fill("https://youtu.be/placeholder-lesson");
    await dialog.getByRole("button", { name: "Сохранить" }).click();

    await expect(firstWindow.getByText("Placeholder урок")).toBeVisible();
    expect(apiServer.state.projects[101]?.lessons.length).toBe(2);

    const queueJob = await waitForQueueJob(userDataPath, (job) => {
      return job.lessonName === "Placeholder урок";
    });

    await waitForQueueJobStatus(userDataPath, queueJob.id, "done");
    await waitForProjectLessonsCount(apiServer, 101, 3);
  } finally {
    await app.close();
    await apiServer.close();
    await rm(userDataPath, { recursive: true, force: true });
  }
});

test("enqueues a local audio lesson from the audio/video modal", async () => {
  const apiServer = await startStatefulApiServer(serverPort);
  const { app, firstWindow, userDataPath } = await launchApp(apiServer);

  try {
    await clickProject(firstWindow);

    await firstWindow.getByRole("button", { name: "Добавить урок из аудио/видео" }).click();
    const dialog = firstWindow.getByRole("dialog");

    await dialog.getByLabel("Название урока").fill("Локальный урок");
    await dialog.locator("input#lesson-audio-file").setInputFiles(localAudioFixturePath);
    await dialog.getByRole("button", { name: "Сохранить" }).click();

    await expect(
      firstWindow.getByRole("heading", { name: "Добавить урок из аудио/видео" }),
    ).toHaveCount(0);

    const queueJob = await waitForQueueJob(userDataPath, (job) => {
      return job.lessonName === "Локальный урок";
    });

    expect(queueJob.kind).toBe("local-file");
    expect(queueJob.sourceFilePath).toContain("local.mp3");

    await waitForQueueJobStatus(userDataPath, queueJob.id, "done");
    await waitForProjectLessonsCount(apiServer, 101, 3);
  } finally {
    await app.close();
    await apiServer.close();
    await rm(userDataPath, { recursive: true, force: true });
  }
});

test("keeps a failed placeholder lesson visible when the server rejects upload", async () => {
  const apiServer = await startStatefulApiServer(serverPort, {
    createLessonFailuresByName: {
      "Урок с ошибкой": {
        statusCode: 422,
        message: "Сервер отклонил урок. Проверьте название и параметры.",
      },
    },
  });
  const { app, firstWindow, userDataPath } = await launchApp(apiServer);

  try {
    await clickProject(firstWindow);

    await firstWindow.getByRole("button", { name: "Добавить урок", exact: true }).click();
    const dialog = firstWindow.getByRole("dialog");

    await dialog.getByLabel("Название урока").fill("Урок с ошибкой");
    await dialog.getByLabel("Ссылка на YouTube").fill("https://youtu.be/rejected-lesson");
    await dialog.getByRole("button", { name: "Сохранить" }).click();

    const queueJob = await waitForQueueJob(userDataPath, (job) => {
      return job.lessonName === "Урок с ошибкой";
    });
    const failedJob = await waitForQueueJobStatus(userDataPath, queueJob.id, "failed");

    expect(failedJob.errorMessage).toBe("Сервер отклонил урок. Проверьте название и параметры.");
    expect(apiServer.state.projects[101]?.lessons.length).toBe(2);
    await expect(firstWindow.getByText("Урок с ошибкой")).toBeVisible();
    await expect(
      firstWindow.getByText("Сервер отклонил урок. Проверьте название и параметры."),
    ).toBeVisible();
  } finally {
    await app.close();
    await apiServer.close();
    await rm(userDataPath, { recursive: true, force: true });
  }
});

test("enqueues multiple YouTube lessons from the batch modal", async () => {
  const apiServer = await startStatefulApiServer(serverPort);
  const { app, firstWindow, userDataPath } = await launchApp(apiServer);

  try {
    await clickProject(firstWindow);

    await firstWindow.getByRole("button", { name: "Добавить список уроков" }).click();
    const dialog = firstWindow.getByRole("dialog");

    await dialog.getByLabel("Список уроков").fill(`Урок 1
https://youtu.be/batch-1

Урок 2
https://youtu.be/batch-2`);
    await dialog.getByRole("button", { name: "Сохранить" }).click();

    await expect(
      firstWindow.getByRole("heading", { name: "Добавить список уроков" }),
    ).toHaveCount(0);

    const firstJob = await waitForQueueJob(userDataPath, (job) => job.lessonName === "Урок 1");
    const secondJob = await waitForQueueJob(userDataPath, (job) => job.lessonName === "Урок 2");
    await waitForQueueJobStatus(userDataPath, firstJob.id, "done");
    await waitForQueueJobStatus(userDataPath, secondJob.id, "done");
    await waitForProjectLessonsCount(apiServer, 101, 4);
  } finally {
    await app.close();
    await apiServer.close();
    await rm(userDataPath, { recursive: true, force: true });
  }
});
