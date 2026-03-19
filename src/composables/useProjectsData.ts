import { shallowRef, watch } from "vue";
import type { FolderItem } from "../types/ui";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface UseProjectsDataOptions {
  enabled: () => boolean;
  revision: () => number;
}

export function useProjectsData(options: UseProjectsDataOptions) {
  const status = shallowRef<LoadStatus>("idle");
  const folders = shallowRef<FolderItem[]>([]);
  const errorMessage = shallowRef<string | null>(null);
  let latestRequestId = 0;

  async function loadProjects(): Promise<void> {
    const requestId = ++latestRequestId;

    status.value = "loading";
    errorMessage.value = null;

    try {
      const response = await window.electronAPI.projects.list();

      if (requestId !== latestRequestId) {
        return;
      }

      folders.value = response.folders;
      status.value = "ready";
    } catch (error) {
      if (requestId !== latestRequestId) {
        return;
      }

      folders.value = [];
      errorMessage.value =
        error instanceof Error ? error.message : "Не удалось загрузить проекты.";
      status.value = "error";
    }
  }

  watch(
    [() => options.enabled(), () => options.revision()],
    ([enabled]) => {
      if (!enabled) {
        folders.value = [];
        errorMessage.value = null;
        status.value = "idle";
        return;
      }

      void loadProjects();
    },
    {
      immediate: true,
    },
  );

  return {
    errorMessage,
    folders,
    status,
  };
}
