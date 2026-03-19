import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SettingsState } from "@electron/shared/dto/settings";

interface StoredConfig {
  accessTokenEncrypted?: string;
  accessTokenPlaintext?: string;
}

export interface TokenCipher {
  isAvailable(): boolean;
  encrypt(value: string): string;
  decrypt(value: string): string;
}

export interface ConfigStoreOptions {
  configPath: string;
  tokenCipher: TokenCipher;
  logger?: Pick<Console, "warn">;
}

export interface ConfigStore {
  getState(): Promise<SettingsState>;
  getAccessToken(): Promise<string | null>;
  saveAccessToken(accessToken: string): Promise<SettingsState>;
}

export function createConfigStore(options: ConfigStoreOptions): ConfigStore {
  async function readConfig(): Promise<StoredConfig> {
    try {
      const fileContents = await readFile(options.configPath, "utf8");

      return JSON.parse(fileContents) as StoredConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }

      throw error;
    }
  }

  async function writeConfig(config: StoredConfig): Promise<void> {
    await mkdir(dirname(options.configPath), { recursive: true });
    await writeFile(options.configPath, JSON.stringify(config, null, 2), "utf8");
  }

  async function getAccessToken(): Promise<string | null> {
    const config = await readConfig();

    if (config.accessTokenEncrypted) {
      return options.tokenCipher.decrypt(config.accessTokenEncrypted);
    }

    if (config.accessTokenPlaintext) {
      return config.accessTokenPlaintext;
    }

    return null;
  }

  async function getState(): Promise<SettingsState> {
    const accessToken = await getAccessToken();

    return {
      hasToken: Boolean(accessToken),
    };
  }

  async function saveAccessToken(accessToken: string): Promise<SettingsState> {
    if (options.tokenCipher.isAvailable()) {
      await writeConfig({
        accessTokenEncrypted: options.tokenCipher.encrypt(accessToken),
      });
    } else {
      options.logger?.warn(
        "Electron safeStorage is unavailable. Falling back to plaintext token storage.",
      );
      await writeConfig({
        accessTokenPlaintext: accessToken,
      });
    }

    return getState();
  }

  return {
    getState,
    getAccessToken,
    saveAccessToken,
  };
}
