import type { SettingsState } from "./settings";
import type { ProjectScreenData, ProjectsListData } from "./projects";
import type {
  EnqueueLocalFileLessonInput,
  EnqueueYoutubeBatchInput,
  EnqueueYoutubeLessonInput,
  QueueJobSnapshot,
  QueueSnapshot,
} from "./queue";

export const APP_NAME = "Video2Book";

export interface RuntimeInfo {
  appName: string;
  platform: NodeJS.Platform;
  versions: {
    chrome: string;
    electron: string;
    node: string;
  };
}

export interface SettingsBridge {
  get(): Promise<SettingsState>;
  saveToken(rawInput: string): Promise<SettingsState>;
}

export interface ProjectsBridge {
  list(): Promise<ProjectsListData>;
  getLessons(projectId: number): Promise<ProjectScreenData>;
}

export interface LessonsBridge {
  enqueueLocalFile(input: EnqueueLocalFileLessonInput): Promise<QueueJobSnapshot>;
  enqueueYoutube(input: EnqueueYoutubeLessonInput): Promise<QueueJobSnapshot>;
  enqueueYoutubeBatch(input: EnqueueYoutubeBatchInput): Promise<QueueJobSnapshot[]>;
}

export interface QueueBridge {
  getSnapshot(projectId?: number): Promise<QueueSnapshot>;
  onChanged(callback: (snapshot: QueueSnapshot) => void): () => void;
}

export interface FilesBridge {
  getPathForFile(file: File): string | null;
}

export interface ElectronApi {
  ping(): Promise<"pong">;
  getRuntimeInfo(): Promise<RuntimeInfo>;
  settings: SettingsBridge;
  projects: ProjectsBridge;
  lessons: LessonsBridge;
  queue: QueueBridge;
  files: FilesBridge;
}
