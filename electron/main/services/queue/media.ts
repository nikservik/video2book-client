import { createWriteStream } from "node:fs";
import { basename, extname } from "node:path";
import { openAsBlob } from "node:fs";
import { chmod, copyFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import type { LessonItem } from "../../../../src/types/ui";
import { ApiClientError, type Video2BookApiClient } from "../api/apiClient";
import { mapCreatedLessonResponse } from "../api/mappers";
import {
  createYtDlpCommand,
  type BinaryPaths,
} from "../binaries/binaryResolver";

const DIRECT_UPLOAD_EXTENSIONS = new Set([
  ".aac",
  ".flac",
  ".m4a",
  ".mp3",
  ".mp4",
  ".oga",
  ".ogg",
  ".wav",
  ".webm",
]);

const AUDIO_MIME_TYPES = new Map([
  [".aac", "audio/aac"],
  [".flac", "audio/flac"],
  [".m4a", "audio/x-m4a"],
  [".mp3", "audio/mpeg"],
  [".mp4", "audio/mp4"],
  [".oga", "audio/ogg"],
  [".ogg", "audio/ogg"],
  [".wav", "audio/wav"],
  [".webm", "audio/webm"],
]);

export interface LocalMediaInspection {
  canUploadDirectly: boolean;
  extension: string;
  hasAudio: boolean;
  hasVideo: boolean;
  sizeBytes: number;
}

export interface LocalMediaInspector {
  inspect(filePath: string, stderrLogPath: string): Promise<LocalMediaInspection>;
}

export interface AudioTranscoder {
  transcodeToMp3(
    inputPath: string,
    outputPath: string,
    stderrLogPath: string,
  ): Promise<string>;
}

export interface YoutubeDownloader {
  downloadAudioToMp3(
    sourceUrl: string,
    outputPath: string,
    stderrLogPath: string,
  ): Promise<string>;
}

export interface LessonUploader {
  uploadAudio(input: {
    filePath: string;
    lessonName: string;
    pipelineVersionId: number | null;
    projectId: number;
    sourceUrl?: string | null;
  }): Promise<LessonItem>;
}

export interface CreateLessonUploaderOptions {
  createApiClient: () => Promise<Video2BookApiClient>;
}

function mapCommandLaunchError(commandPath: string, error: NodeJS.ErrnoException): Error {
  const commandName = basename(commandPath);

  if (error.code === "ENOENT" || error.code === "ENOEXEC") {
    return new Error(`Не удалось запустить ${commandName}. Перезапустите приложение.`);
  }

  return error;
}

export function mapLessonUploadErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Текущий токен больше не подходит. Откройте настройки и введите новый.";
    }

    if (error.status === 404) {
      return "Проект не найден или больше недоступен.";
    }

    if (error.status === 422) {
      const errorPayload =
        typeof error.body === "object" && error.body !== null
          ? (error.body as { message?: unknown })
          : null;
      const payloadMessage =
        typeof errorPayload?.message === "string" ? errorPayload.message : null;

      return payloadMessage ?? "Сервер отклонил урок. Проверьте название и параметры.";
    }

    return "Не удалось загрузить урок на сервер.";
  }

  if (error instanceof TypeError) {
    return "Не удалось соединиться с сервером. Проверьте подключение и повторите попытку.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось загрузить урок на сервер.";
}

async function runCommand(options: {
  args: string[];
  command: string;
  stderrLogPath: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const logStream = createWriteStream(options.stderrLogPath, {
      flags: "a",
    });
    const child = spawn(options.command, options.args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    logStream.write(`$ ${options.command} ${options.args.join(" ")}\n`);

    child.stdout.on("data", (chunk) => {
      const textChunk = chunk.toString();

      stdout += textChunk;
    });
    child.stderr.on("data", (chunk) => {
      const textChunk = chunk.toString();

      stderr += textChunk;
      logStream.write(textChunk);
    });
    child.on("error", (error) => {
      logStream.end();
      reject(mapCommandLaunchError(options.command, error));
    });
    child.on("close", (exitCode) => {
      logStream.end();

      if (exitCode === 0) {
        resolve(stdout);
        return;
      }

      reject(
        new Error(
          stderr.trim() || `${options.command} exited with code ${exitCode ?? "unknown"}.`,
        ),
      );
    });
  });
}

function guessAudioMimeType(filePath: string): string {
  return AUDIO_MIME_TYPES.get(extname(filePath).toLowerCase()) ?? "audio/mpeg";
}

export function createLocalMediaInspector(
  binaryPaths: Pick<BinaryPaths, "ffprobePath">,
): LocalMediaInspector {
  return {
    async inspect(filePath, stderrLogPath) {
      const fileStats = await stat(filePath);
      const stdout = await runCommand({
        command: binaryPaths.ffprobePath,
        args: [
          "-v",
          "error",
          "-print_format",
          "json",
          "-show_streams",
          "-show_format",
          filePath,
        ],
        stderrLogPath,
      });
      const payload = JSON.parse(stdout) as {
        streams?: Array<{
          codec_type?: string;
        }>;
      };
      const streams = payload.streams ?? [];
      const hasAudio = streams.some((stream) => stream.codec_type === "audio");
      const hasVideo = streams.some((stream) => stream.codec_type === "video");
      const extension = extname(filePath).toLowerCase();

      return {
        hasAudio,
        hasVideo,
        extension,
        sizeBytes: fileStats.size,
        canUploadDirectly:
          hasAudio && !hasVideo && DIRECT_UPLOAD_EXTENSIONS.has(extension),
      };
    },
  };
}

export function createAudioTranscoder(
  binaryPaths: Pick<BinaryPaths, "ffmpegPath">,
): AudioTranscoder {
  return {
    async transcodeToMp3(inputPath, outputPath, stderrLogPath) {
      await runCommand({
        command: binaryPaths.ffmpegPath,
        args: [
          "-y",
          "-i",
          inputPath,
          "-vn",
          "-codec:a",
          "libmp3lame",
          "-q:a",
          "2",
          outputPath,
        ],
        stderrLogPath,
      });

      return outputPath;
    },
  };
}

export function createYoutubeDownloader(
  binaryPaths: Pick<BinaryPaths, "denoPath" | "ytDlpPath">,
): YoutubeDownloader {
  return {
    async downloadAudioToMp3(sourceUrl, outputPath, stderrLogPath) {
      const outputTemplate = outputPath.replace(/\.mp3$/i, ".%(ext)s");
      const command = createYtDlpCommand(binaryPaths, [
        "--newline",
        "--continue",
        "--no-overwrites",
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "-o",
        outputTemplate,
        sourceUrl,
      ]);

      await runCommand({
        command: command.executablePath,
        args: command.args,
        stderrLogPath,
      });

      return outputPath;
    },
  };
}

export function createFixtureYoutubeDownloader(
  fixtureAudioPath: string,
): YoutubeDownloader {
  return {
    async downloadAudioToMp3(_sourceUrl, outputPath) {
      await copyFile(fixtureAudioPath, outputPath);
      await chmod(outputPath, 0o755);
      return outputPath;
    },
  };
}

export function createLessonUploader(
  options: CreateLessonUploaderOptions,
): LessonUploader {
  return {
    async uploadAudio(input) {
      try {
        const fileBlob = await openAsBlob(input.filePath, {
          type: guessAudioMimeType(input.filePath),
        });
        const apiClient = await options.createApiClient();
        const response = await apiClient.createProjectLessonFromAudio({
          projectId: input.projectId,
          name: input.lessonName,
          file: fileBlob,
          filename: basename(input.filePath),
          pipelineVersionId: input.pipelineVersionId,
          sourceUrl: input.sourceUrl,
        });

        return mapCreatedLessonResponse(response);
      } catch (error) {
        throw new Error(mapLessonUploadErrorMessage(error));
      }
    },
  };
}
