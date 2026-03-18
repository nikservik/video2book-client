<script setup lang="ts">
import type { LessonSortOption, LessonSortValue } from "../../types/ui";
import AppIcon from "../ui/AppIcon.vue";
import LessonsSortDropdown from "./LessonsSortDropdown.vue";

defineProps<{
  open: boolean;
  sort: LessonSortValue;
  sortOptions: LessonSortOption[];
}>();

const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "update:sort", value: LessonSortValue): void;
  (event: "add-lesson"): void;
  (event: "add-audio-lesson"): void;
  (event: "add-lessons-list"): void;
}>();

function closePanel(): void {
  emit("update:open", false);
}

function handleAddLesson(): void {
  closePanel();
  emit("add-lesson");
}

function handleAddAudioLesson(): void {
  closePanel();
  emit("add-audio-lesson");
}

function handleAddLessonsList(): void {
  closePanel();
  emit("add-lessons-list");
}

function handleSortChange(value: LessonSortValue): void {
  emit("update:sort", value);
  closePanel();
}
</script>

<template>
  <aside
    class="absolute top-0 right-0 left-0 z-20 md:order-2 md:static md:col-span-1 md:block"
    :class="{ hidden: !open }"
  >
    <div
      class="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-gray-800 md:border-none md:bg-transparent md:p-0 md:shadow-none md:dark:bg-transparent"
    >
      <div class="space-y-3">
        <div class="space-y-2">
          <LessonsSortDropdown
            :model-value="sort"
            :options="sortOptions"
            @update:model-value="handleSortChange"
          />
        </div>

        <div class="space-y-2 border-t-0 border-gray-200 pt-3 dark:border-white/10">
          <button
            type="button"
            class="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
            @click="handleAddLesson"
          >
            Добавить урок
          </button>

          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
            @click="handleAddAudioLesson"
          >
            Добавить урок из аудио/видео
          </button>

          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
            @click="handleAddLessonsList"
          >
            <AppIcon name="list-plus" class="size-5" />
            Добавить список уроков
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
