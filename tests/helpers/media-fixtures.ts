import { spawn } from "node:child_process";

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          stderr.trim() || `${command} exited with code ${exitCode ?? "unknown"}.`,
        ),
      );
    });
  });
}

export async function createAudioFixture(
  ffmpegPath: string,
  outputPath: string,
): Promise<void> {
  await runCommand(ffmpegPath, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=880:duration=1",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
}

export async function createVideoFixture(
  ffmpegPath: string,
  outputPath: string,
): Promise<void> {
  await runCommand(ffmpegPath, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=blue:s=320x240:d=1",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=1",
    "-shortest",
    "-c:v",
    "mpeg4",
    "-c:a",
    "aac",
    outputPath,
  ]);
}
