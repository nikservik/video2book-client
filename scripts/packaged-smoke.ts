import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";
import { startStatefulApiServer } from "../tests/e2e/helpers/stateful-api-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const productName = "Video2Book";
const outputDir = resolve(projectRoot, "release-smoke");
const serverPort = 4011;

function runPnpm(args: string[], env: NodeJS.ProcessEnv = {}): void {
  execFileSync("pnpm", args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(rootPath: string): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(rootPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

async function findPackagedExecutable(rootPath: string): Promise<string> {
  const files = await collectFiles(rootPath);

  if (process.platform === "darwin") {
    const executablePath = files.find((filePath) => {
      return filePath.endsWith(`.app/Contents/MacOS/${productName}`);
    });

    if (executablePath) {
      return executablePath;
    }
  }

  if (process.platform === "win32") {
    const executablePath = files.find((filePath) => {
      return extname(filePath) === ".exe" && filePath.endsWith(`${productName}.exe`);
    });

    if (executablePath) {
      return executablePath;
    }
  }

  throw new Error(`Не удалось найти packaged executable в ${rootPath}.`);
}

function resolveResourcesPath(executablePath: string): string {
  if (process.platform === "darwin") {
    return resolve(dirname(executablePath), "..", "Resources");
  }

  if (process.platform === "win32") {
    return resolve(dirname(executablePath), "resources");
  }

  throw new Error(`Платформа ${process.platform} не поддерживается packaged smoke.`);
}

async function assertResourceExists(path: string, label: string): Promise<void> {
  if (!(await pathExists(path))) {
    throw new Error(`В packaged app отсутствует ${label}: ${path}`);
  }
}

async function assertPackagedResources(executablePath: string): Promise<void> {
  const resourcesPath = resolveResourcesPath(executablePath);
  const binPath = join(resourcesPath, "bin");

  await assertResourceExists(resourcesPath, "resources directory");
  await assertResourceExists(binPath, "resources/bin");
  await assertResourceExists(join(binPath, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"), "ffmpeg");
  await assertResourceExists(join(binPath, process.platform === "win32" ? "ffprobe.exe" : "ffprobe"), "ffprobe");
  await assertResourceExists(join(binPath, process.platform === "win32" ? "deno.exe" : "deno"), "deno");
  await assertResourceExists(join(binPath, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"), "yt-dlp");
  await assertResourceExists(join(binPath, "manifest.json"), "binary manifest");
  await assertResourceExists(join(resourcesPath, "THIRD_PARTY_LICENSES.txt"), "third-party licenses");

  if (process.platform === "darwin") {
    const iconPath = join(resourcesPath, "icon.icns");

    await assertResourceExists(iconPath, "macOS app icon");
  }
}

function getBuilderArgs(): string[] {
  if (process.platform === "darwin") {
    return [
      "exec",
      "electron-builder",
      "--mac",
      "dir",
      process.arch === "arm64" ? "--arm64" : "--x64",
      `--config.directories.output=${outputDir}`,
    ];
  }

  if (process.platform === "win32") {
    return [
      "exec",
      "electron-builder",
      "--win",
      "dir",
      "--x64",
      `--config.directories.output=${outputDir}`,
    ];
  }

  throw new Error(`Платформа ${process.platform} не поддерживается packaged smoke.`);
}

async function createUserDataPath(): Promise<string> {
  const userDataPath = await mkdtemp(join(tmpdir(), "video2book-packaged-smoke-"));

  await writeFile(
    join(userDataPath, "config.json"),
    JSON.stringify(
      {
        accessTokenPlaintext: "test-token",
      },
      null,
      2,
    ),
    "utf8",
  );

  return userDataPath;
}

async function main(): Promise<void> {
  await rm(outputDir, { recursive: true, force: true });

  runPnpm(["run", "build:licenses"]);
  runPnpm(["run", "build"]);
  runPnpm(getBuilderArgs(), {
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  });

  const executablePath = await findPackagedExecutable(outputDir);

  await assertPackagedResources(executablePath);

  const apiServer = await startStatefulApiServer(serverPort);
  const userDataPath = await createUserDataPath();
  const app = await electron.launch({
    cwd: projectRoot,
    executablePath,
    env: {
      ...process.env,
      VIDEO2BOOK_API_BASE_URL: apiServer.baseUrl,
      VIDEO2BOOK_USER_DATA_PATH: userDataPath,
    },
  });

  try {
    const firstWindow = await app.firstWindow();

    await firstWindow.getByText("Курсы").waitFor({
      state: "visible",
      timeout: 15_000,
    });
    await firstWindow.getByText("История кино").waitFor({
      state: "visible",
      timeout: 15_000,
    });
    await firstWindow.getByText("История кино").click();
    await firstWindow
      .getByRole("button", { name: "Добавить урок", exact: true })
      .waitFor({
        state: "visible",
        timeout: 15_000,
      });

    const title = await firstWindow.title();

    if (title !== "Добавление уроков в проекты") {
      throw new Error(`Неожиданный title packaged app: ${title}`);
    }
  } finally {
    await app.close();
    await apiServer.close();
    await rm(userDataPath, { recursive: true, force: true });
  }

  console.log(`Packaged smoke passed for ${process.platform}/${process.arch}.`);
}

await main();
