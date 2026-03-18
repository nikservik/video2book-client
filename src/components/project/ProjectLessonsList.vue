<script setup lang="ts">
import type {
  LessonAudioStatus,
  LessonItem,
  PipelineRunStatus,
} from "../../types/ui";
import AppIcon from "../ui/AppIcon.vue";

defineProps<{
  lessons: LessonItem[];
}>();

function pipelineStatusIconName(status: PipelineRunStatus) {
  return (
    {
      done: "status-done",
      queued: "status-queued",
      running: "status-running",
      paused: "status-paused",
      failed: "status-failed",
      unknown: "status-unknown",
    } as const
  )[status];
}

function pipelineRunStatusBadgeClass(status: PipelineRunStatus): string {
  return (
    {
      done: "inline-flex items-center rounded-full bg-green-100 -mr-1 p-0.5 text-xs font-medium whitespace-nowrap text-green-700 dark:bg-green-400/10 dark:text-green-400",
      queued:
        "inline-flex items-center rounded-full bg-gray-100 -mr-1 p-0.5 text-xs font-medium whitespace-nowrap text-gray-600 dark:bg-gray-400/10 dark:text-gray-400",
      running:
        "inline-flex items-center rounded-full bg-amber-100 -mr-1 p-0.5 text-xs font-medium whitespace-nowrap text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
      paused:
        "inline-flex items-center rounded-full bg-sky-100 -mr-1 p-0.5 text-xs font-medium whitespace-nowrap text-sky-700 dark:bg-sky-400/10 dark:text-sky-300",
      failed:
        "inline-flex items-center rounded-full bg-red-100 -mr-1 p-0.5 text-xs font-medium whitespace-nowrap text-red-700 dark:bg-red-400/10 dark:text-red-400",
      unknown:
        "inline-flex items-center rounded-full bg-gray-100 -mr-1 p-0.5 text-xs font-medium whitespace-nowrap text-gray-600 dark:bg-gray-400/10 dark:text-gray-400",
    } as const
  )[status];
}

function lessonAudioDownloadIconClass(status: LessonAudioStatus): string {
  return (
    {
      failed: "text-red-500 dark:text-red-400",
      running: "text-yellow-500 dark:text-yellow-400",
      loaded: "text-green-500 dark:text-green-400",
      queued: "text-gray-500 dark:text-gray-400",
    } as const
  )[status];
}
</script>

<template>
  <div
    v-if="lessons.length === 0"
    class="rounded-lg border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-white/10 dark:bg-gray-800"
  >
    <p class="text-gray-600 dark:text-gray-300">В этом проекте пока нет уроков.</p>
  </div>

  <div
    v-else
    class="overflow-hidden divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm dark:divide-white/10 dark:border-white/10 dark:bg-gray-800"
  >
    <article
      v-for="lesson in lessons"
      :key="lesson.id"
      class="flex flex-col items-start gap-2 px-4 py-3 md:flex-row md:gap-3 md:pr-3"
    >
      <div class="flex w-full items-start justify-between gap-3 md:w-2/3">
        <span class="text-base text-gray-900 dark:text-white">
          {{ lesson.name }}
        </span>

        <div class="mt-px flex items-center gap-1">
          <a
            v-if="lesson.sourceUrl"
            :href="lesson.sourceUrl"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center rounded-lg bg-white p-1 font-semibold text-gray-500 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
            aria-label="Открыть исходник урока"
          >
            <AppIcon name="external-link" class="size-4" />
          </a>

          <span
            :title="lesson.audioStatus === 'failed' ? lesson.audioErrorTooltip : undefined"
            :class="lessonAudioDownloadIconClass(lesson.audioStatus)"
          >
            <AppIcon name="audio-download" class="size-5" />
          </span>

          <span
            class="inline-block w-10 min-w-10 shrink-0 whitespace-nowrap text-right text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {{ lesson.audioDurationLabel ?? "" }}
          </span>
        </div>
      </div>

      <div class="flex w-full items-start gap-1 md:w-1/3">
        <p
          v-if="lesson.pipelineRuns.length === 0"
          class="w-full py-0.5 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          Шаблонов пока нет
        </p>

        <div v-else class="min-w-0 space-y-1">
          <div
            v-for="pipelineRun in lesson.pipelineRuns"
            :key="pipelineRun.id"
            class="group relative min-w-0"
          >
            <div
              class="block min-w-0 rounded-lg border border-gray-200 bg-gray-100 px-3 py-0.5 dark:border-white/10 dark:bg-gray-900/50"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="truncate text-sm text-gray-700 dark:text-gray-200">
                  {{ pipelineRun.title }}
                  <span class="text-gray-500 dark:text-gray-400">
                    • {{ pipelineRun.versionLabel }}
                  </span>
                </span>

                <span :class="pipelineRunStatusBadgeClass(pipelineRun.status)">
                  <AppIcon
                    :name="pipelineStatusIconName(pipelineRun.status)"
                    class="size-4"
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>
