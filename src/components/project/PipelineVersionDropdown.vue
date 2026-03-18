<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
} from "vue";
import type { PipelineVersionOption } from "../../types/ui";
import AppIcon from "../ui/AppIcon.vue";

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    options: PipelineVersionOption[];
    placeholder?: string;
  }>(),
  {
    placeholder: "Выберите версию",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: number | null): void;
}>();

const isOpen = shallowRef(false);
const dropdownRoot = useTemplateRef<HTMLDivElement>("dropdownRoot");

const selectedOption = computed(() => {
  return props.options.find((option) => option.id === props.modelValue) ?? null;
});

const selectedLabel = computed(() => {
  return selectedOption.value?.label ?? props.placeholder;
});

function toggleDropdown(): void {
  isOpen.value = !isOpen.value;
}

function choose(optionId: number): void {
  emit("update:modelValue", optionId);
  isOpen.value = false;
}

function handleDocumentClick(event: MouseEvent): void {
  if (!dropdownRoot.value) {
    return;
  }

  if (dropdownRoot.value.contains(event.target as Node)) {
    return;
  }

  isOpen.value = false;
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>

<template>
  <div ref="dropdownRoot" class="relative">
    <button
      type="button"
      class="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus-visible:outline-indigo-500"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="toggleDropdown"
    >
      <span class="col-start-1 row-start-1 truncate pr-6">
        {{ selectedLabel }}
      </span>
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"
      >
        <path
          d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z"
          clip-rule="evenodd"
          fill-rule="evenodd"
        />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute left-0 z-30 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white shadow-lg outline-1 outline-black/5 dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
    >
      <button
        v-for="option in props.options"
        :key="option.id"
        type="button"
        class="relative block w-full cursor-default py-2 pr-4 pl-8 text-left text-gray-900 select-none hover:bg-indigo-50 dark:text-white dark:hover:bg-indigo-500/20"
        @click="choose(option.id)"
      >
        <span
          class="block truncate text-sm"
          :class="option.id === props.modelValue ? 'font-semibold' : 'font-normal'"
        >
          {{ option.label }}
        </span>
        <span
          class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400"
        >
          {{ option.description || "Описание не задано." }}
        </span>
        <span
          v-if="option.id === props.modelValue"
          class="absolute inset-y-0 left-0 flex items-center pl-1.5 text-indigo-600 dark:text-indigo-400"
        >
          <AppIcon name="check" class="size-5" />
        </span>
      </button>
    </div>
  </div>
</template>
