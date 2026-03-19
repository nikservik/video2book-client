import { join } from "node:path";

export interface ResolveAppUserDataPathOptions {
  appDataPath: string;
  appIsPackaged: boolean;
  appName: string;
  forcedUserDataPath?: string | undefined;
}

export function resolveAppUserDataPath(
  options: ResolveAppUserDataPathOptions,
): string | null {
  const forcedUserDataPath = options.forcedUserDataPath?.trim();

  if (forcedUserDataPath) {
    return forcedUserDataPath;
  }

  if (options.appIsPackaged) {
    return null;
  }

  return join(options.appDataPath, `${options.appName} Dev`);
}
