import { computed, onMounted, shallowRef } from "vue";

export function useSettingsDialog() {
  const hasStoredToken = shallowRef(false);
  const isOpen = shallowRef(false);
  const isLoading = shallowRef(false);
  const errorMessage = shallowRef<string | null>(null);
  const tokenInput = shallowRef("");
  const settingsRevision = shallowRef(0);

  const canClose = computed(() => hasStoredToken.value && !isLoading.value);
  const settingsReady = computed(() => hasStoredToken.value);

  function resetForm(): void {
    tokenInput.value = "";
    errorMessage.value = null;
  }

  async function initialize(): Promise<void> {
    try {
      const settingsState = await window.electronAPI.settings.get();

      hasStoredToken.value = settingsState.hasToken;

      if (!settingsState.hasToken) {
        isOpen.value = true;
      } else {
        settingsRevision.value += 1;
      }
    } catch (error) {
      hasStoredToken.value = false;
      isOpen.value = true;
      errorMessage.value =
        error instanceof Error
          ? error.message
          : "Не удалось прочитать локальные настройки.";
    }
  }

  function openSettings(): void {
    resetForm();
    isOpen.value = true;
  }

  function closeSettings(): void {
    if (!canClose.value) {
      return;
    }

    resetForm();
    isOpen.value = false;
  }

  async function saveToken(): Promise<void> {
    if (!tokenInput.value.trim()) {
      errorMessage.value = "Введите токен доступа.";
      return;
    }

    isLoading.value = true;
    errorMessage.value = null;

    try {
      const settingsState = await window.electronAPI.settings.saveToken(
        tokenInput.value,
      );

      hasStoredToken.value = settingsState.hasToken;

      if (settingsState.hasToken) {
        settingsRevision.value += 1;
        resetForm();
        isOpen.value = false;
      }
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Не удалось сохранить токен.";
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(() => {
    void initialize();
  });

  return {
    canClose,
    closeSettings,
    errorMessage,
    isLoading,
    isOpen,
    openSettings,
    saveToken,
    settingsReady,
    settingsRevision,
    tokenInput,
  };
}
