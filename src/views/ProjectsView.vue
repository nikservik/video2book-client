<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";
import type { BreadcrumbItem, FolderItem } from "../types/ui";
import { foldersMock } from "../data/mockUi";
import AppShell from "../components/ui/AppShell.vue";
import ProjectsFoldersList from "../components/projects/ProjectsFoldersList.vue";

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: "Проекты",
    current: true,
  },
];

const route = useRoute();
const defaultOpenFolderId =
  foldersMock.find((folder) => folder.isOpen)?.id ?? null;
const openFolderId = shallowRef<number | null>(defaultOpenFolderId);

function resolveOpenFolderId(queryValue: unknown): number | null {
  const rawValue = Array.isArray(queryValue) ? queryValue[0] : queryValue;
  const parsedValue =
    typeof rawValue === "string" ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (
    Number.isInteger(parsedValue) &&
    foldersMock.some((folder) => folder.id === parsedValue)
  ) {
    return parsedValue;
  }

  return defaultOpenFolderId;
}

const folders = computed<FolderItem[]>(() => {
  return foldersMock.map((folder) => ({
    ...folder,
    isOpen: folder.id === openFolderId.value,
  }));
});

watch(
  () => route.query.folderId,
  (folderId) => {
    openFolderId.value = resolveOpenFolderId(folderId);
  },
  {
    immediate: true,
  },
);

function toggleFolder(folderId: number): void {
  openFolderId.value = openFolderId.value === folderId ? null : folderId;
}

function openSettings(): void {
  window.dispatchEvent(new CustomEvent("video2book:settings"));
}
</script>

<template>
  <AppShell :breadcrumbs="breadcrumbs" @settings="openSettings">
    <ProjectsFoldersList :folders="folders" @toggle-folder="toggleFolder" />
  </AppShell>
</template>
