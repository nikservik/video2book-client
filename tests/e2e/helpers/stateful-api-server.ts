import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

interface PipelineVersionRecord {
  description: string;
  id: number;
  label: string;
}

interface LessonRunRecord {
  created_at: string;
  done_steps_count: number;
  id: number;
  lesson_id: number;
  pipeline_label: string;
  pipeline_title: string;
  pipeline_version: number;
  pipeline_version_id: number | null;
  status: "done" | "queued" | "running" | "paused" | "failed" | "unknown";
  steps_count: number;
}

interface LessonRecord {
  audio_duration_label: string | null;
  audio_duration_seconds: number | null;
  download_status: "queued" | "running" | "loaded" | "failed";
  id: number;
  name: string;
  project_id: number;
  runs: LessonRunRecord[];
  source_filename: string | null;
  source_url: string | null;
}

interface ProjectRecord {
  default_pipeline_version_id: number | null;
  duration_label: string | null;
  duration_seconds: number | null;
  folder_id: number;
  id: number;
  lessons: LessonRecord[];
  name: string;
  pipeline_versions: PipelineVersionRecord[];
  referer: string | null;
  updated_at: string;
}

interface FolderRecord {
  hidden: boolean;
  id: number;
  name: string;
  projectIds: number[];
}

export interface StatefulApiServer {
  baseUrl: string;
  close(): Promise<void>;
  state: {
    folders: FolderRecord[];
    nextLessonId: number;
    nextRunId: number;
    projects: Record<number, ProjectRecord>;
  };
}

const AUTHORIZATION_HEADER = "Bearer test-token";

function createInitialState() {
  return {
    folders: [
      {
        id: 12,
        name: "Курсы",
        hidden: false,
        projectIds: [101, 102],
      },
    ],
    nextLessonId: 503,
    nextRunId: 9003,
    projects: {
      101: {
        id: 101,
        folder_id: 12,
        name: "История кино",
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
          {
            id: 502,
            project_id: 101,
            name: "Источники влияния",
            source_filename: null,
            source_url: null,
            audio_duration_seconds: null,
            audio_duration_label: null,
            download_status: "running",
            runs: [
              {
                id: 9002,
                lesson_id: 502,
                status: "queued",
                pipeline_version_id: 7,
                pipeline_title: "Базовый шаблон",
                pipeline_version: 3,
                pipeline_label: "Базовый шаблон • v3",
                steps_count: 3,
                done_steps_count: 0,
                created_at: "2026-03-18T09:10:00+00:00",
              },
            ],
          },
        ],
        duration_seconds: 5400,
        duration_label: "1ч 30м",
        default_pipeline_version_id: 7,
        referer: "https://example.com/course",
        updated_at: "2026-03-18T09:15:00+00:00",
        pipeline_versions: [
          {
            id: 7,
            label: "Базовый шаблон • v3",
            description: "Базовая обработка лекции",
          },
        ],
      },
      102: {
        id: 102,
        folder_id: 12,
        name: "Теория монтажа",
        lessons: [],
        duration_seconds: null,
        duration_label: null,
        default_pipeline_version_id: null,
        referer: null,
        updated_at: "2026-03-17T20:40:00+00:00",
        pipeline_versions: [],
      },
    } as Record<number, ProjectRecord>,
  };
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function isAuthorized(request: IncomingMessage): boolean {
  return request.headers.authorization === AUTHORIZATION_HEADER;
}

function buildProjectSummary(project: ProjectRecord) {
  return {
    id: project.id,
    folder_id: project.folder_id,
    name: project.name,
    lessons_count: project.lessons.length,
    duration_seconds: project.duration_seconds,
    duration_label: project.duration_label,
    default_pipeline_version_id: project.default_pipeline_version_id,
    referer: project.referer,
    updated_at: project.updated_at,
  };
}

function buildFoldersResponse(state: ReturnType<typeof createInitialState>) {
  return {
    data: state.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      hidden: folder.hidden,
      projects_count: folder.projectIds.length,
      projects: folder.projectIds.map((projectId) => {
        return buildProjectSummary(state.projects[projectId]!);
      }),
    })),
  };
}

function buildProjectLessonsResponse(project: ProjectRecord) {
  return {
    data: {
      project: buildProjectSummary(project),
      pipeline_versions: project.pipeline_versions,
      lessons: project.lessons,
    },
  };
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parseMultipartFieldValues(requestBody: string, contentType: string): Record<string, string> {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/u);

  if (!boundaryMatch) {
    return {};
  }

  const boundary = boundaryMatch[1] ?? boundaryMatch[2] ?? "";
  const parts = requestBody.split(`--${boundary}`);
  const fields: Record<string, string> = {};

  for (const part of parts) {
    const normalizedPart = part.trim();

    if (normalizedPart.length === 0 || normalizedPart === "--") {
      continue;
    }

    const [rawHeaders, rawValue = ""] = normalizedPart.split("\r\n\r\n");
    const nameMatch = rawHeaders?.match(/name="([^"]+)"/u);

    if (!nameMatch) {
      continue;
    }

    fields[nameMatch[1]] = rawValue.replace(/\r\n$/u, "");
  }

  return fields;
}

function createLessonRun(
  runId: number,
  lessonId: number,
  pipelineVersionId: number | null,
  pipelineVersions: PipelineVersionRecord[],
): LessonRunRecord[] {
  const pipeline = pipelineVersions.find((item) => item.id === pipelineVersionId) ?? null;

  if (!pipelineVersionId || !pipeline) {
    return [];
  }

  return [
    {
      id: runId,
      lesson_id: lessonId,
      status: "queued",
      pipeline_version_id: pipelineVersionId,
      pipeline_title: "Базовый шаблон",
      pipeline_version: 3,
      pipeline_label: pipeline.label,
      steps_count: 3,
      done_steps_count: 0,
      created_at: new Date().toISOString(),
    },
  ];
}

export async function startStatefulApiServer(port: number): Promise<StatefulApiServer> {
  const state = createInitialState();
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

    if (!isAuthorized(request)) {
      sendJson(response, 401, {
        message: "Unauthorized.",
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/folders") {
      sendJson(response, 200, buildFoldersResponse(state));
      return;
    }

    const projectMatch = requestUrl.pathname.match(/^\/api\/projects\/(\d+)\/lessons$/u);

    if (!projectMatch) {
      sendJson(response, 404, {
        message: "Not Found.",
      });
      return;
    }

    const projectId = Number.parseInt(projectMatch[1] ?? "", 10);
    const project = state.projects[projectId];

    if (!project) {
      sendJson(response, 404, {
        message: "Not Found.",
      });
      return;
    }

    if (request.method === "GET") {
      sendJson(response, 200, buildProjectLessonsResponse(project));
      return;
    }

    if (request.method === "POST") {
      const contentType = request.headers["content-type"] ?? "";
      const fields = parseMultipartFieldValues(await readRequestBody(request), contentType);
      const lessonId = state.nextLessonId++;
      const runId = state.nextRunId++;
      const pipelineVersionId =
        fields.pipeline_version_id?.trim().length
          ? Number.parseInt(fields.pipeline_version_id, 10)
          : project.default_pipeline_version_id;
      const lesson: LessonRecord = {
        id: lessonId,
        project_id: projectId,
        name: fields.name?.trim() || `Новый урок ${lessonId}`,
        source_filename: null,
        source_url: null,
        audio_duration_seconds: null,
        audio_duration_label: null,
        download_status: "running",
        runs: createLessonRun(runId, lessonId, pipelineVersionId, project.pipeline_versions),
      };

      project.lessons.push(lesson);
      project.updated_at = new Date().toISOString();

      sendJson(response, 201, {
        data: {
          project: buildProjectSummary(project),
          lesson,
        },
      });
      return;
    }

    sendJson(response, 405, {
      message: "Method Not Allowed.",
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    state,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}
