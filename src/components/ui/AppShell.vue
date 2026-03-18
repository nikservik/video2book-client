<script setup lang="ts">
import type { BreadcrumbItem } from "../../types/ui";
import AppBreadcrumbs from "./AppBreadcrumbs.vue";
import AppHeader from "./AppHeader.vue";

defineProps<{
  breadcrumbs: BreadcrumbItem[];
}>();

const emit = defineEmits<{
  (event: "settings"): void;
}>();
</script>

<template>
  <div class="min-h-full">
    <AppHeader @settings="emit('settings')" />

    <div class="pb-10">
      <header>
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AppBreadcrumbs :items="breadcrumbs" />
        </div>
      </header>

      <main>
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
