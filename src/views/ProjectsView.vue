<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";
import type { BreadcrumbItem, FolderItem } from "../types/ui";
import { useProjectsData } from "../composables/useProjectsData";
import AppShell from "../components/ui/AppShell.vue";
import ProjectsFoldersList from "../components/projects/ProjectsFoldersList.vue";

const props = withDefaults(
  defineProps<{
    settingsReady?: boolean;
    settingsRevision?: number;
  }>(),
  {
    settingsReady: true,
    settingsRevision: 0,
  },
);

const emit = defineEmits<{
  (event: "open-settings"): void;
}>();

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: "Проекты",
    current: true,
  },
];

const route = useRoute();
const { errorMessage, folders: loadedFolders, status } = useProjectsData({
  enabled: () => props.settingsReady,
  revision: () => props.settingsRevision,
});
const openFolderId = shallowRef<number | null>(null);

function resolveOpenFolderId(
  queryValue: unknown,
  availableFolders: FolderItem[],
  currentOpenFolderId: number | null,
): number | null {
  if (availableFolders.length === 0) {
    return null;
  }

  const rawValue = Array.isArray(queryValue) ? queryValue[0] : queryValue;
  const parsedValue =
    typeof rawValue === "string" ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (
    Number.isInteger(parsedValue) &&
    availableFolders.some((folder) => folder.id === parsedValue)
  ) {
    return parsedValue;
  }

  if (
    currentOpenFolderId !== null &&
    availableFolders.some((folder) => folder.id === currentOpenFolderId)
  ) {
    return currentOpenFolderId;
  }

  return availableFolders[0]?.id ?? null;
}

const folders = computed<FolderItem[]>(() => {
  return loadedFolders.value.map((folder) => ({
    ...folder,
    isOpen: folder.id === openFolderId.value,
  }));
});

const isIdle = computed(() => !props.settingsReady);
const isLoading = computed(() => {
  return status.value === "loading" && loadedFolders.value.length === 0;
});
const isError = computed(() => status.value === "error");

watch(
  [() => route.query.folderId, loadedFolders],
  ([folderId, availableFolders]) => {
    openFolderId.value = resolveOpenFolderId(
      folderId,
      availableFolders,
      openFolderId.value,
    );
  },
  {
    immediate: true,
  },
);

function toggleFolder(folderId: number): void {
  openFolderId.value = openFolderId.value === folderId ? null : folderId;
}

function openSettings(): void {
  emit("open-settings");
}
</script>

<template>
  <AppShell :breadcrumbs="breadcrumbs" @settings="openSettings">
    <div
      v-if="isIdle"
      class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-800"
    >
      <p class="text-gray-600 dark:text-gray-300">
        Введите токен доступа, чтобы загрузить список проектов.
      </p>
    </div>

    <div
      v-else-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-800"
    >
      <p class="text-gray-600 dark:text-gray-300">Загружаем проекты...</p>
    </div>

    <div
      v-else-if="isError"
      class="space-y-4 rounded-lg border border-red-200 bg-white p-6 shadow-sm dark:border-red-400/20 dark:bg-gray-800"
    >
      <p class="text-gray-900 dark:text-white">Не удалось загрузить проекты.</p>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        {{ errorMessage }}
      </p>
      <button
        type="button"
        class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400"
        @click="openSettings"
      >
        Открыть настройки
      </button>
    </div>

    <ProjectsFoldersList
      v-else
      :folders="folders"
      @toggle-folder="toggleFolder"
    />
  </AppShell>
</template>
