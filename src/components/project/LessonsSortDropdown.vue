<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
} from "vue";
import type { LessonSortOption, LessonSortValue } from "../../types/ui";

const props = defineProps<{
  modelValue: LessonSortValue;
  options: LessonSortOption[];
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: LessonSortValue): void;
}>();

const isOpen = shallowRef(false);
const dropdownRoot = useTemplateRef<HTMLDivElement>("dropdownRoot");

const selectedLabel = computed(() => {
  return (
    props.options.find((option) => option.value === props.modelValue)?.label ??
    "Сортировка по дате добавления"
  );
});

function choose(value: LessonSortValue): void {
  emit("update:modelValue", value);
  isOpen.value = false;
}

function toggleDropdown(): void {
  isOpen.value = !isOpen.value;
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
      class="grid w-full grid-cols-[1fr_auto_1fr] items-center rounded-lg bg-white py-2 pr-2 pl-3 text-sm font-semibold text-gray-900 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 dark:bg-white/10 dark:text-white dark:outline-white/10 dark:focus-visible:outline-indigo-500"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="toggleDropdown"
    >
      <span class="col-start-2 min-w-0 truncate text-center">
        {{ selectedLabel }}
      </span>
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        class="col-start-3 size-4 justify-self-end text-gray-500 dark:text-gray-400"
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
      class="absolute left-0 z-30 mt-1 w-full overflow-auto rounded-lg bg-white shadow-lg outline-1 outline-black/5 dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
    >
      <button
        v-for="option in props.options"
        :key="option.value"
        type="button"
        class="block w-full cursor-default px-3 py-2 text-left text-sm text-gray-900 select-none dark:text-white"
        :class="
          option.value === props.modelValue
            ? 'bg-indigo-50 font-semibold dark:bg-indigo-500/20'
            : 'hover:bg-indigo-50 dark:hover:bg-indigo-500/20'
        "
        @click="choose(option.value)"
      >
        <span class="block truncate">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>
