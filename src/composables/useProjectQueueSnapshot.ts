import { onBeforeUnmount, shallowRef, watch } from "vue";
import type { QueueSnapshot } from "@electron/shared/dto/queue";

export interface UseProjectQueueSnapshotOptions {
  enabled: () => boolean;
  projectId: () => number | null;
  revision: () => number;
}

const EMPTY_QUEUE_SNAPSHOT: QueueSnapshot = {
  jobs: [],
};

export function useProjectQueueSnapshot(options: UseProjectQueueSnapshotOptions) {
  const queueSnapshot = shallowRef<QueueSnapshot>(EMPTY_QUEUE_SNAPSHOT);
  const errorMessage = shallowRef<string | null>(null);
  const status = shallowRef<"idle" | "loading" | "ready" | "error">("idle");
  let unsubscribe: (() => void) | null = null;
  let latestRequestId = 0;

  async function refreshSnapshot(projectId: number): Promise<void> {
    const requestId = ++latestRequestId;

    status.value = "loading";
    errorMessage.value = null;

    try {
      const snapshot = await window.electronAPI.queue.getSnapshot(projectId);

      if (requestId !== latestRequestId) {
        return;
      }

      queueSnapshot.value = snapshot;
      status.value = "ready";
    } catch (error) {
      if (requestId !== latestRequestId) {
        return;
      }

      queueSnapshot.value = EMPTY_QUEUE_SNAPSHOT;
      errorMessage.value =
        error instanceof Error ? error.message : "Не удалось получить состояние очереди.";
      status.value = "error";
    }
  }

  function resetSnapshot(): void {
    unsubscribe?.();
    unsubscribe = null;
    queueSnapshot.value = EMPTY_QUEUE_SNAPSHOT;
    errorMessage.value = null;
    status.value = "idle";
  }

  watch(
    [() => options.enabled(), () => options.revision(), () => options.projectId()],
    ([enabled, _revision, projectId]) => {
      if (!enabled || !projectId) {
        resetSnapshot();
        return;
      }

      unsubscribe?.();
      unsubscribe = window.electronAPI.queue.onChanged((snapshot) => {
        if (options.projectId() !== projectId) {
          return;
        }

        queueSnapshot.value = {
          jobs: snapshot.jobs.filter((job) => job.projectId === projectId),
        };
        status.value = "ready";
        errorMessage.value = null;
      });

      void refreshSnapshot(projectId);
    },
    {
      immediate: true,
    },
  );

  onBeforeUnmount(() => {
    unsubscribe?.();
    unsubscribe = null;
  });

  return {
    errorMessage,
    queueSnapshot,
    refreshSnapshot,
    status,
  };
}
