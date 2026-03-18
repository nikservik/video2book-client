import { describe, expect, it } from "vitest";
import {
  DEVELOPMENT_API_BASE_URL,
  PRODUCTION_API_BASE_URL,
  resolveApiBaseUrl,
} from "@electron/main/services/api/runtime";

describe("resolveApiBaseUrl", () => {
  it("uses the development URL during local development and test mode", () => {
    expect(resolveApiBaseUrl({ nodeEnv: "development" })).toBe(
      DEVELOPMENT_API_BASE_URL,
    );
    expect(resolveApiBaseUrl({ nodeEnv: "test" })).toBe(
      DEVELOPMENT_API_BASE_URL,
    );
  });

  it("uses the production URL for packaged and production builds", () => {
    expect(resolveApiBaseUrl({ nodeEnv: "production" })).toBe(
      PRODUCTION_API_BASE_URL,
    );
    expect(resolveApiBaseUrl({ appIsPackaged: true, nodeEnv: "development" })).toBe(
      PRODUCTION_API_BASE_URL,
    );
  });
});
