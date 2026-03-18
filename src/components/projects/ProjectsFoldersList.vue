<script setup lang="ts">
import { useRouter } from "vue-router";
import type { FolderItem } from "../../types/ui";
import AppIcon from "../ui/AppIcon.vue";

const props = defineProps<{
  folders: FolderItem[];
}>();

const emit = defineEmits<{
  (event: "toggle-folder", folderId: number): void;
}>();

const router = useRouter();

function openProject(projectUrl: string): void {
  void router.push(projectUrl);
}
</script>

<template>
  <div class="space-y-6">
    <div
      v-if="props.folders.length === 0"
      class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-800"
    >
      <p class="text-gray-600 dark:text-gray-300">Пока нет папок.</p>
    </div>

    <div
      v-else
      class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-800"
    >
      <div class="divide-y divide-gray-200 dark:divide-white/10">
        <section v-for="folder in props.folders" :key="folder.id">
          <div
            class="flex cursor-pointer items-center gap-3 px-3 py-3 md:px-5"
            @click="emit('toggle-folder', folder.id)"
          >
            <AppIcon
              :name="folder.isOpen ? 'folder-open' : 'folder-closed'"
              class="size-5"
              :class="
                folder.isOpen
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-300'
              "
            />

            <div class="flex min-w-0 flex-1 justify-between gap-3 md:items-center">
              <div class="flex min-w-0 items-center gap-2">
                <p class="truncate font-semibold text-gray-900 dark:text-white">
                  {{ folder.name }}
                </p>

                <AppIcon
                  v-if="folder.isHidden"
                  name="folder-hidden"
                  class="size-5 shrink-0 text-gray-500 dark:text-gray-400"
                />

                <p class="mt-0.5 hidden shrink-0 text-sm text-gray-500 dark:text-gray-400 md:block">
                  Проектов: {{ folder.projectsCount }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="folder.isOpen" class="border-t border-gray-200 dark:border-white/10">
            <div
              v-if="folder.projects.length === 0"
              class="px-4 py-5 text-sm text-gray-500 dark:text-gray-400 md:px-5"
            >
              В этой папке пока нет проектов.
            </div>

            <div v-else class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                <tbody class="divide-y divide-gray-200 dark:divide-white/10">
                  <tr
                    v-for="project in folder.projects"
                    :key="project.id"
                    class="cursor-pointer bg-gray-100 transition hover:bg-gray-50 dark:bg-gray-900/70 dark:hover:bg-white/5"
                    @click="openProject(project.to)"
                  >
                    <td class="w-10 min-w-10 max-w-10 py-2 text-right md:w-17 md:min-w-17 md:max-w-17"></td>

                    <td
                      class="w-full max-w-0 px-3 py-2 text-sm font-medium text-gray-900 md:w-auto md:max-w-none dark:text-white"
                    >
                      <p class="truncate">{{ project.name }}</p>

                      <p class="mt-1 leading-tight font-normal md:hidden">
                        <span class="mr-2 inline-block truncate text-gray-500 dark:text-gray-400">
                          Уроков: {{ project.lessonsCount }}
                        </span>
                        <span class="inline-block truncate text-gray-500 dark:text-gray-400">
                          Длительность: {{ project.durationLabel }}
                        </span>
                      </p>
                    </td>

                    <td class="hidden px-4 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-300">
                      Уроков: {{ project.lessonsCount }}
                    </td>

                    <td class="hidden px-4 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-300">
                      Длительность: {{ project.durationLabel }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
