import { ipcMain } from "electron";
import { ApiClientError, createApiClient } from "../services/api/apiClient";
import type { ConfigStore } from "../services/config/configStore";
import { normalizeAccessTokenInput } from "../services/config/tokenInput";

const SETTINGS_GET_CHANNEL = "settings:get";
const SETTINGS_SAVE_TOKEN_CHANNEL = "settings:saveToken";

export interface RegisterSettingsIpcOptions {
  appIsPackaged: boolean;
  configStore: ConfigStore;
}

function mapSettingsErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Токен недействителен. Проверьте введённое значение.";
    }

    return "Не удалось проверить токен на сервере.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось сохранить токен.";
}

export function registerSettingsIpcHandlers(
  options: RegisterSettingsIpcOptions,
): void {
  ipcMain.removeHandler(SETTINGS_GET_CHANNEL);
  ipcMain.removeHandler(SETTINGS_SAVE_TOKEN_CHANNEL);

  ipcMain.handle(SETTINGS_GET_CHANNEL, async () => {
    return options.configStore.getState();
  });

  ipcMain.handle(SETTINGS_SAVE_TOKEN_CHANNEL, async (_event, rawInput: string) => {
    const normalizedToken = normalizeAccessTokenInput(rawInput);

    if (!normalizedToken) {
      throw new Error("Введите токен доступа.");
    }

    try {
      await createApiClient({
        accessToken: normalizedToken,
        appIsPackaged: options.appIsPackaged,
      }).listFolders();
    } catch (error) {
      throw new Error(mapSettingsErrorMessage(error));
    }

    return options.configStore.saveAccessToken(normalizedToken);
  });
}
