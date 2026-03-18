<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    maxWidthClass?: string;
  }>(),
  {
    maxWidthClass: "sm:max-w-lg",
  },
);

const emit = defineEmits<{
  (event: "close"): void;
}>();
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-0 z-50 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="fixed inset-0 bg-gray-500/75 transition-opacity dark:bg-gray-900/50"
      @click="emit('close')"
    />

    <div
      tabindex="0"
      class="flex min-h-full items-end justify-center p-4 text-center focus:outline-none sm:items-center sm:p-0"
    >
      <div
        class="relative w-full transform overflow-visible rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:p-6 dark:bg-gray-800 dark:outline dark:-outline-offset-1 dark:outline-white/10"
        :class="props.maxWidthClass"
        @click.stop
      >
        <slot />
      </div>
    </div>

    <slot name="after" />
  </div>
</template>
