<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useRoute } from "vue-router";
import type {
  BreadcrumbItem,
  LessonItem,
  LessonSortValue,
} from "../types/ui";
import {
  foldersMock,
  lessonSortOptionsMock,
  pipelineVersionOptionsMock,
  projectMock,
} from "../data/mockUi";
import AddLessonFromAudioModal from "../components/project/modals/AddLessonFromAudioModal.vue";
import AddLessonsListModal from "../components/project/modals/AddLessonsListModal.vue";
import CreateLessonModal from "../components/project/modals/CreateLessonModal.vue";
import AppIcon from "../components/ui/AppIcon.vue";
import AppShell from "../components/ui/AppShell.vue";
import ProjectActionsPanel from "../components/project/ProjectActionsPanel.vue";
import ProjectLessonsList from "../components/project/ProjectLessonsList.vue";

const route = useRoute();
const actionsMenuOpen = shallowRef(false);
const lessonSort = shallowRef<LessonSortValue>("created_at");
const showCreateLessonModal = shallowRef(false);
const showAddLessonFromAudioModal = shallowRef(false);
const showAddLessonsListModal = shallowRef(false);

const selectedProjectRecord = computed(() => {
  const rawProjectId = Array.isArray(route.params.projectId)
    ? route.params.projectId[0]
    : route.params.projectId;
  const projectId =
    typeof rawProjectId === "string"
      ? Number.parseInt(rawProjectId, 10)
      : Number.NaN;

  for (const folder of foldersMock) {
    const project = folder.projects.find(
      (folderProject) => folderProject.id === projectId,
    );

    if (project) {
      return {
        folderId: folder.id,
        project,
      };
    }
  }

  return null;
});

const project = computed(() => {
  const selectedProject = selectedProjectRecord.value?.project;

  return {
    ...projectMock,
    id: selectedProject?.id ?? projectMock.id,
    name: selectedProject?.name ?? projectMock.name,
    durationLabel: selectedProject?.durationLabel ?? projectMock.durationLabel,
  };
});

const parentFolderId = computed(() => {
  return (
    selectedProjectRecord.value?.folderId ??
    foldersMock.find((folder) =>
      folder.projects.some((folderProject) => folderProject.id === project.value.id),
    )?.id ??
    null
  );
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  {
    label: "Проекты",
    to: parentFolderId.value ? `/projects?folderId=${parentFolderId.value}` : "/projects",
  },
  {
    label: project.value.name,
    current: true,
  },
]);

const sortedLessons = computed<LessonItem[]>(() => {
  if (lessonSort.value === "name") {
    return [...project.value.lessons].sort((left, right) =>
      left.name.localeCompare(right.name, "ru"),
    );
  }

  return [...project.value.lessons].sort(
    (left, right) => left.createdAtOrder - right.createdAtOrder,
  );
});

function openSettings(): void {
  window.dispatchEvent(new CustomEvent("video2book:settings"));
}

function handleAddLesson(): void {
  setActionsMenuOpen(false);
  showCreateLessonModal.value = true;
}

function handleAddAudioLesson(): void {
  setActionsMenuOpen(false);
  showAddLessonFromAudioModal.value = true;
}

function handleAddLessonsList(): void {
  setActionsMenuOpen(false);
  showAddLessonsListModal.value = true;
}

function toggleActionsMenu(): void {
  actionsMenuOpen.value = !actionsMenuOpen.value;
}

function setActionsMenuOpen(value: boolean): void {
  actionsMenuOpen.value = value;
}

function setLessonSort(value: LessonSortValue): void {
  lessonSort.value = value;
}

function closeCreateLessonModal(): void {
  showCreateLessonModal.value = false;
}

function closeAddLessonFromAudioModal(): void {
  showAddLessonFromAudioModal.value = false;
}

function closeAddLessonsListModal(): void {
  showAddLessonsListModal.value = false;
}

function saveCreateLesson(payload: {
  lessonName: string;
  youtubeUrl: string;
  pipelineVersionId: number | null;
}): void {
  window.dispatchEvent(new CustomEvent("video2book:create-lesson", { detail: payload }));
  closeCreateLessonModal();
}

function saveLessonFromAudio(payload: {
  lessonName: string;
  audioFile: File | null;
  pipelineVersionId: number | null;
}): void {
  window.dispatchEvent(
    new CustomEvent("video2book:create-audio-lesson", { detail: payload }),
  );
  closeAddLessonFromAudioModal();
}

function saveLessonsList(payload: { lessonsList: string }): void {
  window.dispatchEvent(
    new CustomEvent("video2book:create-lessons-list", { detail: payload }),
  );
  closeAddLessonsListModal();
}
</script>

<template>
  <AppShell :breadcrumbs="breadcrumbs" @settings="openSettings">
    <div class="space-y-6">
      <div class="mx-2 flex items-center justify-between gap-3 md:mx-6">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {{ project.name }}
          <span
            v-if="project.durationLabel"
            class="ml-0 inline-block text-lg font-normal tracking-normal text-gray-500 dark:text-gray-400 md:ml-3"
          >
            Длительность {{ project.durationLabel }}
          </span>
        </h1>

        <button
          type="button"
          class="relative inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white dark:focus:outline-indigo-500 md:hidden"
          :aria-expanded="actionsMenuOpen ? 'true' : 'false'"
          @click="toggleActionsMenu"
        >
          <span class="absolute -inset-0.5"></span>
          <span class="sr-only">Открыть меню действий проекта</span>
          <AppIcon v-if="!actionsMenuOpen" name="menu" class="size-6" />
          <AppIcon v-else name="close" class="size-6" />
        </button>
      </div>

      <div
        v-if="actionsMenuOpen"
        class="fixed inset-0 z-10 md:hidden"
        @click="setActionsMenuOpen(false)"
      />

      <div class="relative grid grid-cols-1 gap-6 md:grid-cols-3">
        <ProjectActionsPanel
          :open="actionsMenuOpen"
          :sort="lessonSort"
          :sort-options="lessonSortOptionsMock"
          @update:open="setActionsMenuOpen"
          @update:sort="setLessonSort"
          @add-lesson="handleAddLesson"
          @add-audio-lesson="handleAddAudioLesson"
          @add-lessons-list="handleAddLessonsList"
        />

        <section class="md:order-1 md:col-span-2">
          <ProjectLessonsList :lessons="sortedLessons" />
        </section>
      </div>

      <CreateLessonModal
        :open="showCreateLessonModal"
        :pipeline-version-options="pipelineVersionOptionsMock"
        :duplicate-lesson-warning="null"
        @close="closeCreateLessonModal"
        @save="saveCreateLesson"
      />

      <AddLessonFromAudioModal
        :open="showAddLessonFromAudioModal"
        :pipeline-version-options="pipelineVersionOptionsMock"
        @close="closeAddLessonFromAudioModal"
        @save="saveLessonFromAudio"
      />

      <AddLessonsListModal
        :open="showAddLessonsListModal"
        @close="closeAddLessonsListModal"
        @save="saveLessonsList"
      />
    </div>
  </AppShell>
</template>
