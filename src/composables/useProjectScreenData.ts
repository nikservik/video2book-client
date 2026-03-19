import { shallowRef, watch } from "vue";
import type { ProjectScreenData } from "@electron/shared/dto/projects";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface UseProjectScreenDataOptions {
  enabled: () => boolean;
  revision: () => number;
  projectId: () => number | null;
}

export function useProjectScreenData(options: UseProjectScreenDataOptions) {
  const status = shallowRef<LoadStatus>("idle");
  const projectScreen = shallowRef<ProjectScreenData | null>(null);
  const errorMessage = shallowRef<string | null>(null);
  let latestRequestId = 0;

  async function loadProjectScreen(projectId: number): Promise<void> {
    const requestId = ++latestRequestId;

    status.value = "loading";
    errorMessage.value = null;

    try {
      const response = await window.electronAPI.projects.getLessons(projectId);

      if (requestId !== latestRequestId) {
        return;
      }

      projectScreen.value = response;
      status.value = "ready";
    } catch (error) {
      if (requestId !== latestRequestId) {
        return;
      }

      projectScreen.value = null;
      errorMessage.value =
        error instanceof Error ? error.message : "Не удалось загрузить проект.";
      status.value = "error";
    }
  }

  watch(
    [() => options.enabled(), () => options.revision(), () => options.projectId()],
    ([enabled, _revision, projectId]) => {
      if (!enabled) {
        projectScreen.value = null;
        errorMessage.value = null;
        status.value = "idle";
        return;
      }

      if (!projectId) {
        projectScreen.value = null;
        errorMessage.value = "Некорректный идентификатор проекта.";
        status.value = "error";
        return;
      }

      void loadProjectScreen(projectId);
    },
    {
      immediate: true,
    },
  );

  return {
    errorMessage,
    projectScreen,
    refreshProjectScreen: loadProjectScreen,
    status,
  };
}
