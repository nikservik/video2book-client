import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createConfigStore } from "@electron/main/services/config/configStore";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => {
      return rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("config store", () => {
  it("stores the token in encrypted form when encryption is available", async () => {
    const directory = await mkdtemp(join(tmpdir(), "video2book-client-config-"));
    temporaryDirectories.push(directory);

    const store = createConfigStore({
      configPath: join(directory, "config.json"),
      tokenCipher: {
        isAvailable: () => true,
        encrypt: (value) => `enc:${value}`,
        decrypt: (value) => value.replace(/^enc:/, ""),
      },
    });

    await store.saveAccessToken("secret-token");

    expect(await store.getState()).toEqual({
      hasToken: true,
    });
    expect(await store.getAccessToken()).toBe("secret-token");

    const rawConfig = JSON.parse(
      await readFile(join(directory, "config.json"), "utf8"),
    );

    expect(rawConfig).toEqual({
      accessTokenEncrypted: "enc:secret-token",
    });
  });

  it("falls back to plaintext storage when safeStorage is unavailable", async () => {
    const directory = await mkdtemp(join(tmpdir(), "video2book-client-config-"));
    temporaryDirectories.push(directory);

    const store = createConfigStore({
      configPath: join(directory, "config.json"),
      tokenCipher: {
        isAvailable: () => false,
        encrypt: (value) => value,
        decrypt: (value) => value,
      },
    });

    await store.saveAccessToken("plain-token");

    expect(await store.getAccessToken()).toBe("plain-token");

    const rawConfig = JSON.parse(
      await readFile(join(directory, "config.json"), "utf8"),
    );

    expect(rawConfig).toEqual({
      accessTokenPlaintext: "plain-token",
    });
  });
});
