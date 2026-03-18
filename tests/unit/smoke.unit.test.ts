import { describe, expect, it } from "vitest";
import { APP_NAME } from "@electron/shared/dto/ipc";

describe("unit scaffold", () => {
  it("exposes the shared app name", () => {
    expect(APP_NAME).toBe("Video2Book");
  });
});
