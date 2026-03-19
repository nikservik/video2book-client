import { describe, expect, it, vi } from "vitest";
import {
  createApiClient,
} from "@electron/main/services/api/apiClient";
import {
  DEVELOPMENT_API_BASE_URL,
  PRODUCTION_API_BASE_URL,
} from "@electron/main/services/api/runtime";

function createJsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
    },
    status: 200,
  });
}

function readRequestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

describe("createApiClient", () => {
  it("uses the production base URL for packaged builds", async () => {
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      expect(readRequestUrl(input)).toBe(`${PRODUCTION_API_BASE_URL}api/folders`);

      return createJsonResponse({
        data: [],
      });
    });

    await createApiClient({
      accessToken: "token",
      appIsPackaged: true,
      fetch: fetchMock as typeof fetch,
    }).listFolders();
  });

  it("uses the development base URL for unpackaged local runs", async () => {
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      expect(readRequestUrl(input)).toBe(`${DEVELOPMENT_API_BASE_URL}api/folders`);

      return createJsonResponse({
        data: [],
      });
    });

    await createApiClient({
      accessToken: "token",
      appIsPackaged: false,
      fetch: fetchMock as typeof fetch,
    }).listFolders();
  });
});
