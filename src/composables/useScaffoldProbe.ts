import { computed, onMounted, ref } from "vue";
import type { RuntimeInfo } from "@electron/shared/dto/ipc";

export function useScaffoldProbe() {
  const status = ref<"idle" | "loading" | "ready" | "error">("idle");
  const runtimeInfo = ref<RuntimeInfo | null>(null);
  const errorMessage = ref<string | null>(null);

  onMounted(async () => {
    if (!window.electronAPI) {
      status.value = "error";
      errorMessage.value = "Electron preload API is not available.";
      return;
    }

    status.value = "loading";

    try {
      const [pingResult, nextRuntimeInfo] = await Promise.all([
        window.electronAPI.ping(),
        window.electronAPI.getRuntimeInfo(),
      ]);

      if (pingResult !== "pong") {
        throw new Error(`Unexpected ping response: ${pingResult}`);
      }

      runtimeInfo.value = nextRuntimeInfo;
      status.value = "ready";
    } catch (error) {
      status.value = "error";
      errorMessage.value =
        error instanceof Error ? error.message : "Unknown scaffold error.";
    }
  });

  return {
    errorMessage,
    isReady: computed(() => status.value === "ready"),
    runtimeInfo,
    status,
  };
}
