<script setup lang="ts">
import { computed } from "vue";
import BaseDialog from "../ui/BaseDialog.vue";

const props = defineProps<{
  open: boolean;
  loading: boolean;
  errorMessage?: string | null;
  canCancel: boolean;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "save"): void;
}>();

const tokenModel = defineModel<string>({
  required: true,
});

const submitLabel = computed(() => {
  return props.loading ? "Проверяем..." : "Сохранить";
});

function handleClose(): void {
  if (!props.canCancel || props.loading) {
    return;
  }

  emit("close");
}
</script>

<template>
  <BaseDialog :open="props.open" max-width-class="sm:max-w-lg" @close="handleClose">
    <form class="space-y-5" @submit.prevent="emit('save')">
      <div>
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">
          Введите токен доступа
        </h3>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Вставьте токен пользователя или invite-ссылку. URL сервера уже задан для этого окружения автоматически.
        </p>
      </div>

      <div>
        <label
          for="settings-access-token"
          class="block text-sm/6 font-medium text-gray-900 dark:text-white"
        >
          Token
        </label>
        <div class="mt-2 grid grid-cols-1">
          <input
            id="settings-access-token"
            v-model="tokenModel"
            type="text"
            name="access_token"
            autocomplete="off"
            class="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-3 pl-3 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
            placeholder="Например: 52f1465a-4318-475f-87dd-4aa3cdc9f269"
          />
        </div>

        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Если вы вставите invite URL, приложение автоматически возьмёт токен из последнего сегмента ссылки.
        </p>

        <p
          v-if="props.errorMessage"
          class="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {{ props.errorMessage }}
        </p>
      </div>

      <div class="mt-10 sm:flex sm:flex-row-reverse">
        <button
          type="submit"
          class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 sm:ml-3 sm:w-auto dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400"
          :disabled="props.loading"
        >
          {{ submitLabel }}
        </button>
        <button
          v-if="props.canCancel"
          type="button"
          class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring-1 inset-ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-0 sm:w-auto dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
          :disabled="props.loading"
          @click="handleClose"
        >
          Отменить
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
