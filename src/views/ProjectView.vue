<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";
import type {
  BreadcrumbItem,
  LessonItem,
  LessonSortValue,
} from "../types/ui";
import {
  lessonSortOptionsMock,
} from "../data/mockUi";
import { useProjectLessonActions } from "../composables/useProjectLessonActions";
import { useProjectQueueSnapshot } from "../composables/useProjectQueueSnapshot";
import { useProjectScreenData } from "../composables/useProjectScreenData";
import { mergeProjectLessons } from "../utils/projectLessonsMerge";
import AddLessonFromAudioModal from "../components/project/modals/AddLessonFromAudioModal.vue";
import AddLessonsListModal from "../components/project/modals/AddLessonsListModal.vue";
import CreateLessonModal from "../components/project/modals/CreateLessonModal.vue";
import AppIcon from "../components/ui/AppIcon.vue";
import AppShell from "../components/ui/AppShell.vue";
import ProjectActionsPanel from "../components/project/ProjectActionsPanel.vue";
import ProjectLessonsList from "../components/project/ProjectLessonsList.vue";

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

const route = useRoute();
const actionsMenuOpen = shallowRef(false);
const lessonSort = shallowRef<LessonSortValue>("created_at");

const projectId = computed(() => {
  const rawProjectId = Array.isArray(route.params.projectId)
    ? route.params.projectId[0]
    : route.params.projectId;
  const parsedProjectId =
    typeof rawProjectId === "string"
      ? Number.parseInt(rawProjectId, 10)
      : Number.NaN;

  return Number.isInteger(parsedProjectId) ? parsedProjectId : null;
});
const {
  errorMessage,
  projectScreen,
  refreshProjectScreen,
  status,
} = useProjectScreenData({
  enabled: () => props.settingsReady,
  revision: () => props.settingsRevision,
  projectId: () => projectId.value,
});
const project = computed(() => projectScreen.value?.project ?? null);
const pipelineVersionOptions = computed(() => {
  return projectScreen.value?.pipelineVersions ?? [];
});

const parentFolderId = computed(() => {
  return projectScreen.value?.parentFolderId ?? null;
});
const { queueSnapshot, refreshSnapshot } = useProjectQueueSnapshot({
  enabled: () => props.settingsReady,
  projectId: () => projectId.value,
  revision: () => props.settingsRevision,
});
const {
  addLessonFromAudioErrorMessage,
  addLessonFromAudioSubmitting,
  addLessonsListErrorMessage,
  addLessonsListSubmitting,
  closeAddLessonFromAudioModal,
  closeAddLessonsListModal,
  closeCreateLessonModal,
  createLessonErrorMessage,
  createLessonSubmitting,
  enqueueLocalFileLesson,
  enqueueYoutubeBatch,
  enqueueYoutubeLesson,
  openAddLessonFromAudioModal,
  openAddLessonsListModal,
  openCreateLessonModal,
  showAddLessonFromAudioModal,
  showAddLessonsListModal,
  showCreateLessonModal,
} = useProjectLessonActions({
  projectId: () => projectId.value,
  onQueueUpdated: async () => {
    if (projectId.value) {
      await refreshSnapshot(projectId.value);
    }
  },
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  {
    label: "Проекты",
    to: parentFolderId.value ? `/projects?folderId=${parentFolderId.value}` : "/projects",
  },
  {
    label: project.value?.name ?? "Проект",
    current: true,
  },
]);

const missingCreatedLessonIdsKey = computed(() => {
  if (!project.value) {
    return "";
  }

  const apiLessonIds = new Set(project.value.lessons.map((lesson) => lesson.id));
  const missingCreatedLessonIds = queueSnapshot.value.jobs
    .map((job) => job.createdLesson)
    .filter((lesson): lesson is LessonItem => lesson !== null && !apiLessonIds.has(lesson.id))
    .map((lesson) => lesson.id)
    .sort((left, right) => left - right);

  return missingCreatedLessonIds.join(",");
});

const sortedLessons = computed<LessonItem[]>(() => {
  if (!project.value) {
    return [];
  }

  const mergedLessons = mergeProjectLessons(
    project.value.lessons,
    queueSnapshot.value.jobs,
  );

  if (lessonSort.value === "name") {
    return [...mergedLessons].sort((left, right) =>
      left.name.localeCompare(right.name, "ru"),
    );
  }

  return [...mergedLessons].sort(
    (left, right) => left.createdAtOrder - right.createdAtOrder,
  );
});
const isIdle = computed(() => !props.settingsReady);
const isLoading = computed(() => status.value === "loading" && !project.value);
const isError = computed(() => status.value === "error" || !project.value);

function openSettings(): void {
  emit("open-settings");
}

function handleAddLesson(): void {
  setActionsMenuOpen(false);
  openCreateLessonModal();
}

function handleAddAudioLesson(): void {
  setActionsMenuOpen(false);
  openAddLessonFromAudioModal();
}

function handleAddLessonsList(): void {
  setActionsMenuOpen(false);
  openAddLessonsListModal();
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

watch(
  [() => projectId.value, () => missingCreatedLessonIdsKey.value],
  ([currentProjectId, missingLessonIdsKey]) => {
    if (!currentProjectId || !missingLessonIdsKey) {
      return;
    }

    void refreshProjectScreen(currentProjectId);
  },
  {
    immediate: true,
  },
);

</script>

<template>
  <AppShell :breadcrumbs="breadcrumbs" @settings="openSettings">
    <div
      v-if="isIdle"
      class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-800"
    >
      <p class="text-gray-600 dark:text-gray-300">
        Введите токен доступа, чтобы загрузить уроки проекта.
      </p>
    </div>

    <div
      v-else-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-800"
    >
      <p class="text-gray-600 dark:text-gray-300">Загружаем проект...</p>
    </div>

    <div
      v-else-if="isError"
      class="space-y-4 rounded-lg border border-red-200 bg-white p-6 shadow-sm dark:border-red-400/20 dark:bg-gray-800"
    >
      <p class="text-gray-900 dark:text-white">Не удалось загрузить проект.</p>
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

    <div v-else class="space-y-6">
      <div class="mx-2 flex items-center justify-between gap-3 md:mx-6">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {{ project?.name }}
          <span
            v-if="project?.durationLabel"
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
        :pipeline-version-options="pipelineVersionOptions"
        :duplicate-lesson-warning="null"
        :error-message="createLessonErrorMessage"
        :submitting="createLessonSubmitting"
        @close="closeCreateLessonModal"
        @save="enqueueYoutubeLesson"
      />

      <AddLessonFromAudioModal
        :open="showAddLessonFromAudioModal"
        :pipeline-version-options="pipelineVersionOptions"
        :error-message="addLessonFromAudioErrorMessage"
        :submitting="addLessonFromAudioSubmitting"
        @close="closeAddLessonFromAudioModal"
        @save="enqueueLocalFileLesson"
      />

      <AddLessonsListModal
        :open="showAddLessonsListModal"
        :error-message="addLessonsListErrorMessage"
        :submitting="addLessonsListSubmitting"
        @close="closeAddLessonsListModal"
        @save="enqueueYoutubeBatch"
      />
    </div>
  </AppShell>
</template>
