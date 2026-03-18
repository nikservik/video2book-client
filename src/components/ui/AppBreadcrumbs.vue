<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { BreadcrumbItem } from "../../types/ui";
import AppIcon from "./AppIcon.vue";

defineProps<{
  items: BreadcrumbItem[];
}>();
</script>

<template>
  <nav aria-label="Breadcrumb" class="flex py-4">
    <ol
      role="list"
      class="flex flex-wrap items-center gap-x-3 gap-y-2 pl-7 text-gray-500 dark:text-gray-400 md:flex-nowrap md:gap-y-0 md:pl-0"
    >
      <li class="-ml-7 shrink-0 md:ml-0">
        <RouterLink
          to="/projects"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <AppIcon name="home" class="size-4 shrink-0" />
          <span class="sr-only">Главная</span>
        </RouterLink>
      </li>

      <li
        v-for="item in items"
        :key="`${item.label}-${item.to ?? 'current'}`"
        class="flex min-w-0 max-w-full flex-nowrap items-center gap-3 text-sm"
      >
        <AppIcon
          name="chevron-right"
          class="size-4 shrink-0 text-gray-400 dark:text-gray-500"
        />

        <span
          v-if="item.current || !item.to"
          class="max-w-full font-medium text-gray-700 dark:text-gray-200"
          :aria-current="item.current ? 'page' : undefined"
        >
          {{ item.label }}
        </span>

        <RouterLink
          v-else
          :to="item.to"
          class="max-w-full font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {{ item.label }}
        </RouterLink>
      </li>
    </ol>
  </nav>
</template>
