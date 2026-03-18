<script setup lang="ts">
import { shallowRef } from "vue";
import { RouterLink } from "vue-router";
import type {
  PipelineVersionOption,
  YoutubeDuplicateLessonWarning,
} from "../../../types/ui";
import BaseDialog from "../../ui/BaseDialog.vue";
import PipelineVersionDropdown from "../PipelineVersionDropdown.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    pipelineVersionOptions: PipelineVersionOption[];
    duplicateLessonWarning?: YoutubeDuplicateLessonWarning | null;
  }>(),
  {
    duplicateLessonWarning: null,
  },
);

const emit = defineEmits<{
  (event: "close"): void;
  (
    event: "save",
    payload: {
      lessonName: string;
      youtubeUrl: string;
      pipelineVersionId: number | null;
    },
  ): void;
}>();

const lessonName = shallowRef("");
const youtubeUrl = shallowRef("");
const pipelineVersionId = shallowRef<number | null>(
  props.pipelineVersionOptions[0]?.id ?? null,
);

function setPipelineVersionId(value: number | null): void {
  pipelineVersionId.value = value;
}

function submit(): void {
  emit("save", {
    lessonName: lessonName.value,
    youtubeUrl: youtubeUrl.value,
    pipelineVersionId: pipelineVersionId.value,
  });
}
</script>

<template>
  <BaseDialog :open="props.open" max-width-class="sm:max-w-lg" @close="emit('close')">
    <form class="space-y-5" @submit.prevent="submit">
      <div>
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">
          Добавить урок
        </h3>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Заполните название, ссылку на YouTube и версию шаблона.
        </p>
      </div>

      <div>
        <label for="lesson-name" class="block text-sm/6 font-medium text-gray-900 dark:text-white">
          Название урока
        </label>
        <div class="mt-2 grid grid-cols-1">
          <input
            id="lesson-name"
            v-model="lessonName"
            type="text"
            name="lesson_name"
            class="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-3 pl-3 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
          />
        </div>
      </div>

      <div>
        <label
          for="lesson-youtube-url"
          class="block text-sm/6 font-medium text-gray-900 dark:text-white"
        >
          Ссылка на YouTube
        </label>
        <div class="mt-2 grid grid-cols-1">
          <input
            id="lesson-youtube-url"
            v-model="youtubeUrl"
            type="url"
            name="lesson_youtube_url"
            class="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-3 pl-3 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
          />
        </div>

        <p
          v-if="props.duplicateLessonWarning"
          class="mt-2 text-sm text-amber-700 dark:text-amber-400"
        >
          Урок с таким видео уже есть:
          <RouterLink
            :to="props.duplicateLessonWarning.projectTo"
            class="font-semibold underline decoration-amber-500/70 underline-offset-2 hover:text-amber-600 dark:hover:text-amber-300"
          >
            {{ props.duplicateLessonWarning.projectName }} -
            {{ props.duplicateLessonWarning.lessonName }}
          </RouterLink>
        </p>
      </div>

      <div>
        <label
          for="lesson-pipeline-version"
          class="block text-sm/6 font-medium text-gray-900 dark:text-white"
        >
          Версия шаблона
        </label>
        <div class="mt-2">
          <PipelineVersionDropdown
            :model-value="pipelineVersionId"
            :options="props.pipelineVersionOptions"
            @update:model-value="setPipelineVersionId"
          />
        </div>
      </div>

      <div class="mt-10 sm:flex sm:flex-row-reverse">
        <button
          type="submit"
          class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 sm:ml-3 sm:w-auto dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400"
        >
          Сохранить
        </button>
        <button
          type="button"
          class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring-1 inset-ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
          @click="emit('close')"
        >
          Отменить
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
