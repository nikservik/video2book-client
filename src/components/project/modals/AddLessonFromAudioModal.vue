<script setup lang="ts">
import { shallowRef } from "vue";
import type { PipelineVersionOption } from "../../../types/ui";
import BaseDialog from "../../ui/BaseDialog.vue";
import AppIcon from "../../ui/AppIcon.vue";
import PipelineVersionDropdown from "../PipelineVersionDropdown.vue";

const props = defineProps<{
  open: boolean;
  pipelineVersionOptions: PipelineVersionOption[];
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (
    event: "save",
    payload: {
      lessonName: string;
      audioFile: File | null;
      pipelineVersionId: number | null;
    },
  ): void;
}>();

const lessonName = shallowRef("");
const audioFile = shallowRef<File | null>(null);
const selectedAudioFilename = shallowRef<string | null>(null);
const pipelineVersionId = shallowRef<number | null>(
  props.pipelineVersionOptions[0]?.id ?? null,
);
const isUploading = shallowRef(false);
const showUploadErrorNotification = shallowRef(false);

function setPipelineVersionId(value: number | null): void {
  pipelineVersionId.value = value;
}

function closeUploadErrorNotification(): void {
  showUploadErrorNotification.value = false;
}

function reloadPage(): void {
  window.location.reload();
}

function handleAudioFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0] ?? null;

  audioFile.value = selectedFile;
  selectedAudioFilename.value = selectedFile?.name ?? null;
  showUploadErrorNotification.value = false;

  if (!selectedFile) {
    isUploading.value = false;
    return;
  }

  isUploading.value = true;

  window.setTimeout(() => {
    isUploading.value = false;
  }, 600);
}

function submit(): void {
  emit("save", {
    lessonName: lessonName.value,
    audioFile: audioFile.value,
    pipelineVersionId: pipelineVersionId.value,
  });
}
</script>

<template>
  <BaseDialog :open="props.open" max-width-class="sm:max-w-lg" @close="emit('close')">
    <form class="space-y-5" @submit.prevent="submit">
      <div>
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">
          Добавить урок из аудио/видео
        </h3>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Укажите название, версию шаблона и загрузите аудио- или видеофайл.
        </p>
      </div>

      <div>
        <label
          for="audio-lesson-name"
          class="block text-sm/6 font-medium text-gray-900 dark:text-white"
        >
          Название урока
        </label>
        <div class="mt-2 grid grid-cols-1">
          <input
            id="audio-lesson-name"
            v-model="lessonName"
            type="text"
            name="audio_lesson_name"
            class="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-3 pl-3 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
          />
        </div>
      </div>

      <div>
        <label for="lesson-audio-file" class="block text-sm/6 font-medium text-gray-900 dark:text-white">
          Аудио или видеофайл
        </label>
        <label
          for="lesson-audio-file"
          class="relative mt-2 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-0 text-center hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-white/15 dark:bg-white/5 dark:hover:border-indigo-400/70 dark:hover:bg-indigo-500/10"
        >
          <input
            id="lesson-audio-file"
            type="file"
            accept=".mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.webm,.mp4,audio/*"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            @change="handleAudioFileChange"
          />

          <div class="py-20">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              Перетащите аудио- или видеофайл сюда или нажмите для выбора
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              MP3, WAV, M4A, AAC, OGG, FLAC, WEBM, MP4
            </p>
            <p
              v-if="selectedAudioFilename"
              class="mt-3 text-sm text-indigo-700 dark:text-indigo-300"
            >
              Выбран файл: {{ selectedAudioFilename }}
            </p>
          </div>
        </label>

        <div
          v-if="isUploading"
          class="mt-2 text-sm text-gray-600 dark:text-gray-300"
        >
          Загрузка файла...
        </div>
      </div>

      <div>
        <label
          for="audio-lesson-pipeline-version"
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

    <template #after>
      <div
        aria-live="assertive"
        class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6"
      >
        <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
          <div
            v-if="showUploadErrorNotification"
            class="pointer-events-auto w-full max-w-sm translate-y-0 transform rounded-lg bg-white opacity-100 shadow-lg outline-1 outline-black/5 transition duration-300 ease-out sm:translate-x-0 dark:bg-gray-800 dark:-outline-offset-1 dark:outline-white/10"
          >
            <div class="p-4">
              <div class="flex items-start">
                <div class="shrink-0">
                  <AppIcon
                    name="alert-triangle"
                    class="size-6 text-red-500 dark:text-red-400"
                  />
                </div>
                <div class="ml-3 w-0 flex-1 pt-0.5">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    Не удалось загрузить файл
                  </p>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Попробуйте выбрать файл ещё раз. Если ошибка повторится, обновите страницу и повторите загрузку.
                  </p>
                  <div class="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      class="inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                      @click="reloadPage"
                    >
                      Обновить страницу
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                      @click="closeUploadErrorNotification"
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
                <div class="ml-4 flex shrink-0">
                  <button
                    type="button"
                    class="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:hover:text-white dark:focus:outline-indigo-500"
                    @click="closeUploadErrorNotification"
                  >
                    <span class="sr-only">Закрыть уведомление</span>
                    <AppIcon name="close" class="size-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseDialog>
</template>
