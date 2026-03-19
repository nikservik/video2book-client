<script setup lang="ts">
import appLogo from "../../assets/favicon.png";
import { useTheme } from "../../composables/useTheme";
import AppIcon from "./AppIcon.vue";

const emit = defineEmits<{
  (event: "settings"): void;
}>();

const { theme, setLightTheme, setDarkTheme } = useTheme();
</script>

<template>
  <nav class="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800/50">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 justify-between">
        <div class="flex items-center gap-3">
          <div class="flex shrink-0 items-center">
            <img :src="appLogo" alt="Video2Book" class="h-8 w-auto" />
          </div>

          <div class="min-w-0">
            <p class="truncate text-sm font-semibold tracking-wide text-gray-900 dark:text-white sm:text-base">
              Добавление уроков в проекты
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="inline-flex items-center gap-0.5 rounded-full bg-gray-900/5 p-0.5 text-gray-700 dark:bg-white/10 dark:text-gray-200"
            role="group"
            aria-label="Theme switcher"
          >
            <button
              type="button"
              :aria-pressed="theme === 'light'"
              class="rounded-full p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-500"
              :class="theme === 'light' ? 'bg-white shadow-sm' : ''"
              @click="setLightTheme"
            >
              <span class="sr-only">Switch to light theme</span>
              <AppIcon name="sun" class="size-5" />
            </button>

            <button
              type="button"
              :aria-pressed="theme === 'dark'"
              class="rounded-full p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-500"
              :class="theme === 'dark' ? 'bg-gray-200 shadow-sm dark:bg-gray-600' : ''"
              @click="setDarkTheme"
            >
              <span class="sr-only">Switch to dark theme</span>
              <AppIcon name="moon" class="size-5" />
            </button>
          </div>

          <button
            type="button"
            aria-label="Открыть настройки"
            class="relative rounded-full p-1 text-gray-500 hover:text-gray-700 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:text-gray-300 dark:hover:text-white dark:focus:outline-indigo-500"
            @click="emit('settings')"
          >
            <span class="absolute -inset-1.5"></span>
            <span class="sr-only">Open settings</span>
            <AppIcon name="settings" class="size-6" />
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
