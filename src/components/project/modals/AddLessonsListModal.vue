<script setup lang="ts">
import { shallowRef, watch } from "vue";
import BaseDialog from "../../ui/BaseDialog.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
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
  (event: "save", payload: { lessonsList: string }): void;
}>();

const lessonsList = shallowRef("");
const lessonsListError = shallowRef<string | null>(null);

function resetForm(): void {
  lessonsList.value = "";
  lessonsListError.value = null;
}

function submit(): void {
  lessonsListError.value = null;

  if (lessonsList.value.trim().length === 0) {
    lessonsListError.value = "Добавьте хотя бы один урок в список.";
    return;
  }

  emit("save", {
    lessonsList: lessonsList.value,
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
  <BaseDialog :open="props.open" max-width-class="sm:max-w-2xl" @close="emit('close')">
    <form class="space-y-5" @submit.prevent="submit">
      <div>
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">
          Добавить список уроков
        </h3>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Каждый урок указывается парой строк: заголовок и ссылка на видео.
        </p>
      </div>

      <div>
        <label
          for="project-lessons-list"
          class="block text-sm/6 font-medium text-gray-900 dark:text-white"
        >
          Список уроков
        </label>
        <div class="mt-2 grid grid-cols-1">
          <textarea
            id="project-lessons-list"
            v-model="lessonsList"
            name="project_lessons_list"
            rows="10"
            class="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-3 pl-3 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
          />
        </div>
        <p
          v-if="lessonsListError"
          class="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {{ lessonsListError }}
        </p>
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
