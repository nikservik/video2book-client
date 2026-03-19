import createClient from "openapi-fetch";
import type { components, paths } from "@electron/shared/api/schema";
import { resolveApiBaseUrl } from "./runtime";

type ApiFoldersResponse = components["schemas"]["FoldersResponse"];
type ApiProjectLessonsResponse = components["schemas"]["ProjectLessonsResponse"];
type ApiProjectLessonCreateResponse =
  components["schemas"]["ProjectLessonCreateResponse"];

export interface CreateProjectLessonFromAudioInput {
  projectId: number;
  name: string;
  file: Blob;
  filename: string;
  pipelineVersionId?: number | null;
  sourceUrl?: string | null;
}

export interface ApiClientOptions {
  accessToken: string;
  appIsPackaged?: boolean;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export interface Video2BookApiClient {
  listFolders(): Promise<ApiFoldersResponse>;
  listProjectLessons(projectId: number): Promise<ApiProjectLessonsResponse>;
  createProjectLessonFromAudio(
    input: CreateProjectLessonFromAudioInput,
  ): Promise<ApiProjectLessonCreateResponse>;
}

export class ApiClientError extends Error {
  readonly status: number | null;
  readonly body: unknown;

  constructor(message: string, options: { status?: number | null; body?: unknown } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status ?? null;
    this.body = options.body;
  }
}

function stripTrailingSlashes(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function createDefaultHeaders(accessToken: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

function createRequestUrl(baseUrl: string, pathname: string): string {
  const normalizedBaseUrl = `${stripTrailingSlashes(baseUrl)}/`;
  const normalizedPathname = pathname.replace(/^\/+/, "");

  return new URL(normalizedPathname, normalizedBaseUrl).toString();
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  return JSON.parse(responseText) as T;
}

function createTypedClient(options: Required<ApiClientOptions>) {
  return createClient<paths>({
    baseUrl: stripTrailingSlashes(options.baseUrl),
    fetch: options.fetch,
    headers: createDefaultHeaders(options.accessToken),
  });
}

async function unwrapApiResponse<T>(request: Promise<{
  data?: T;
  error?: unknown;
  response: Response;
}>): Promise<T> {
  const { data, error, response } = await request;

  if (data) {
    return data;
  }

  throw new ApiClientError(
    `API request failed with status ${response.status}.`,
    {
      status: response.status,
      body: error,
    },
  );
}

export function createApiClient(options: ApiClientOptions): Video2BookApiClient {
  const resolvedOptions: Required<ApiClientOptions> = {
    accessToken: options.accessToken,
    appIsPackaged: options.appIsPackaged ?? false,
    baseUrl:
      options.baseUrl ??
      resolveApiBaseUrl({
        appIsPackaged: options.appIsPackaged ?? false,
      }),
    fetch: options.fetch ?? globalThis.fetch,
  };
  const client = createTypedClient(resolvedOptions);

  return {
    async listFolders() {
      return unwrapApiResponse(
        client.GET("/api/folders"),
      );
    },

    async listProjectLessons(projectId) {
      return unwrapApiResponse(
        client.GET("/api/projects/{project}/lessons", {
          params: {
            path: {
              project: projectId,
            },
          },
        }),
      );
    },

    async createProjectLessonFromAudio(input) {
      const requestBody = new FormData();

      requestBody.set("name", input.name);

      if (input.pipelineVersionId !== null && input.pipelineVersionId !== undefined) {
        requestBody.set("pipeline_version_id", String(input.pipelineVersionId));
      }

      if (input.sourceUrl?.trim()) {
        requestBody.set("source_url", input.sourceUrl.trim());
      }

      requestBody.set("file", input.file, input.filename);

      const response = await resolvedOptions.fetch(
        createRequestUrl(resolvedOptions.baseUrl, "/api/projects/" + input.projectId + "/lessons"),
        {
          method: "POST",
          headers: createDefaultHeaders(resolvedOptions.accessToken),
          body: requestBody,
        },
      );
      const responseBody = await parseJsonResponse<
        ApiProjectLessonCreateResponse | unknown
      >(response);

      if (!response.ok || !responseBody) {
        throw new ApiClientError(
          `API request failed with status ${response.status}.`,
          {
            status: response.status,
            body: responseBody,
          },
        );
      }

      return responseBody as ApiProjectLessonCreateResponse;
    },
  };
}
