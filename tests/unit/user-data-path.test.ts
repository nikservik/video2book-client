import { describe, expect, it } from "vitest";
import { resolveAppUserDataPath } from "@electron/main/services/config/userDataPath";

describe("resolveAppUserDataPath", () => {
  it("returns the forced path when the runtime explicitly overrides userData", () => {
    expect(
      resolveAppUserDataPath({
        appDataPath: "/Users/test/Library/Application Support",
        appIsPackaged: false,
        appName: "Video2Book",
        forcedUserDataPath: "/tmp/video2book-test-data",
      }),
    ).toBe("/tmp/video2book-test-data");
  });

  it("separates local development storage from the installed app", () => {
    expect(
      resolveAppUserDataPath({
        appDataPath: "/Users/test/Library/Application Support",
        appIsPackaged: false,
        appName: "Video2Book",
      }),
    ).toBe("/Users/test/Library/Application Support/Video2Book Dev");
  });

  it("keeps the default packaged userData path for installed builds", () => {
    expect(
      resolveAppUserDataPath({
        appDataPath: "/Users/test/Library/Application Support",
        appIsPackaged: true,
        appName: "Video2Book",
      }),
    ).toBeNull();
  });
});
