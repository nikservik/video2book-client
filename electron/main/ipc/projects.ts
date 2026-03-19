import { ipcMain } from "electron";
import { ApiClientError, createApiClient } from "../services/api/apiClient";
import {
  mapFoldersResponse,
  mapProjectLessonsResponse,
} from "../services/api/mappers";
import type { ConfigStore } from "../services/config/configStore";

const PROJECTS_LIST_CHANNEL = "projects:list";
const PROJECTS_GET_LESSONS_CHANNEL = "projects:getLessons";

export interface RegisterProjectsIpcOptions {
  configStore: ConfigStore;
}

function mapProjectsErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Текущий токен больше не подходит. Откройте настройки и введите новый.";
    }

    if (error.status === 404) {
      return "Проект не найден или больше недоступен.";
    }

    return "Не удалось получить данные с сервера.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось получить данные с сервера.";
}

async function createAuthorizedApiClient(configStore: ConfigStore) {
  const accessToken = await configStore.getAccessToken();

  if (!accessToken) {
    throw new Error("Введите токен доступа в настройках.");
  }

  return createApiClient({
    accessToken,
  });
}

export function registerProjectsIpcHandlers(
  options: RegisterProjectsIpcOptions,
): void {
  ipcMain.removeHandler(PROJECTS_LIST_CHANNEL);
  ipcMain.removeHandler(PROJECTS_GET_LESSONS_CHANNEL);

  ipcMain.handle(PROJECTS_LIST_CHANNEL, async () => {
    try {
      const apiClient = await createAuthorizedApiClient(options.configStore);
      const response = await apiClient.listFolders();

      return {
        folders: mapFoldersResponse(response),
      };
    } catch (error) {
      throw new Error(mapProjectsErrorMessage(error));
    }
  });

  ipcMain.handle(
    PROJECTS_GET_LESSONS_CHANNEL,
    async (_event, projectId: number) => {
      try {
        const apiClient = await createAuthorizedApiClient(options.configStore);
        const response = await apiClient.listProjectLessons(projectId);

        return mapProjectLessonsResponse(response);
      } catch (error) {
        throw new Error(mapProjectsErrorMessage(error));
      }
    },
  );
}
