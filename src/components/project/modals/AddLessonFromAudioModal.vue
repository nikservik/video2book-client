<script setup lang="ts">
import { shallowRef, watch } from "vue";
import type { PipelineVersionOption } from "../../../types/ui";
import BaseDialog from "../../ui/BaseDialog.vue";
import PipelineVersionDropdown from "../PipelineVersionDropdown.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    pipelineVersionOptions: PipelineVersionOption[];
    errorMessage?: string | null;
    submitting?: boolean;
  }>(),
  {
    errorMessage: null,
    submitting: false,
  },
);

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
const lessonNameError = shallowRef<string | null>(null);
const audioFileError = shallowRef<string | null>(null);

function resetForm(): void {
  lessonName.value = "";
  audioFile.value = null;
  selectedAudioFilename.value = null;
  pipelineVersionId.value = props.pipelineVersionOptions[0]?.id ?? null;
  lessonNameError.value = null;
  audioFileError.value = null;
}

function setPipelineVersionId(value: number | null): void {
  pipelineVersionId.value = value;
}

function handleAudioFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0] ?? null;

  audioFile.value = selectedFile;
  selectedAudioFilename.value = selectedFile?.name ?? null;
  audioFileError.value = null;
}

function submit(): void {
  lessonNameError.value = null;
  audioFileError.value = null;

  if (lessonName.value.trim().length === 0) {
    lessonNameError.value = "Введите название урока.";
  }

  if (!audioFile.value) {
    audioFileError.value = "Выберите аудио- или видеофайл.";
  }

  if (lessonNameError.value || audioFileError.value) {
    return;
  }

  emit("save", {
    lessonName: lessonName.value.trim(),
    audioFile: audioFile.value,
    pipelineVersionId: pipelineVersionId.value,
  });
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      resetForm();
    }
  },
);
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
        <p
          v-if="lessonNameError"
          class="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {{ lessonNameError }}
        </p>
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
        <p
          v-if="audioFileError"
          class="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {{ audioFileError }}
        </p>
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

      <p
        v-if="props.errorMessage"
        class="text-sm text-red-600 dark:text-red-400"
      >
        {{ props.errorMessage }}
      </p>

      <div class="mt-10 sm:flex sm:flex-row-reverse">
        <button
          type="submit"
          :disabled="props.submitting"
          class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 sm:ml-3 sm:w-auto dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400"
          :class="{ 'cursor-not-allowed opacity-70': props.submitting }"
        >
          {{ props.submitting ? "Сохраняем..." : "Сохранить" }}
        </button>
        <button
          type="button"
          :disabled="props.submitting"
          class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring-1 inset-ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
          @click="emit('close')"
        >
          Отменить
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
