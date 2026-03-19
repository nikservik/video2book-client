<script setup lang="ts">
import { RouterView } from "vue-router";
import SettingsTokenModal from "./components/settings/SettingsTokenModal.vue";
import { useSettingsDialog } from "./composables/useSettingsDialog";

const {
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
} = useSettingsDialog();
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component
      :is="Component"
      :settings-ready="settingsReady"
      :settings-revision="settingsRevision"
      @open-settings="openSettings"
    />
  </RouterView>

  <SettingsTokenModal
    v-model="tokenInput"
    :open="isOpen"
    :loading="isLoading"
    :error-message="errorMessage"
    :can-cancel="canClose"
    @close="closeSettings"
    @save="saveToken"
  />
</template>
