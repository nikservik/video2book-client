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

export interface ElectronApi {
  ping(): Promise<"pong">;
  getRuntimeInfo(): Promise<RuntimeInfo>;
}
