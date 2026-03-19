import type { SettingsState } from "./settings";
import type { ProjectScreenData, ProjectsListData } from "./projects";

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

export interface ElectronApi {
  ping(): Promise<"pong">;
  getRuntimeInfo(): Promise<RuntimeInfo>;
  settings: SettingsBridge;
  projects: ProjectsBridge;
}
