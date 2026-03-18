import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

describe("integration scaffold", () => {
  it("can use a temporary workspace", async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), "video2book-client-"));
    const filePath = join(tempDirectory, "smoke.txt");

    await writeFile(filePath, "ready", "utf8");

    const fileContents = await readFile(filePath, "utf8");

    expect(fileContents).toBe("ready");

    await rm(tempDirectory, { recursive: true, force: true });
  });
});
