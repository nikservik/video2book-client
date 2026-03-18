<script setup lang="ts">
import { useScaffoldProbe } from "../composables/useScaffoldProbe";

const { errorMessage, isReady, runtimeInfo, status } = useScaffoldProbe();
</script>

<template>
  <section
    data-testid="projects-view"
    class="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16"
  >
    <div class="w-full rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/30">
      <p class="text-sm font-medium uppercase tracking-[0.3em] text-sky-300">
        Phase 1
      </p>
      <h1 class="mt-4 text-4xl font-semibold tracking-tight">
        Projects scaffold is ready
      </h1>
      <p class="mt-4 max-w-3xl text-base leading-7 text-slate-300">
        Electron main, preload, Vue renderer, Tailwind and test tooling are wired
        together. This screen will be replaced by the real projects UI in phase 2.
      </p>

      <div class="mt-8 grid gap-4 md:grid-cols-2">
        <article class="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <p class="text-sm font-medium text-slate-300">Preload handshake</p>
          <p
            v-if="isReady"
            data-testid="app-ready"
            class="mt-3 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-300"
          >
            Ready
          </p>
          <p
            v-else
            class="mt-3 inline-flex rounded-full bg-amber-400/15 px-3 py-1 text-sm font-medium text-amber-300"
          >
            {{ status }}
          </p>
          <p v-if="errorMessage" class="mt-3 text-sm text-rose-300">
            {{ errorMessage }}
          </p>
        </article>

        <article class="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <p class="text-sm font-medium text-slate-300">Runtime info</p>
          <dl v-if="runtimeInfo" class="mt-3 space-y-2 text-sm text-slate-200">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-400">App</dt>
              <dd>{{ runtimeInfo.appName }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-400">Platform</dt>
              <dd>{{ runtimeInfo.platform }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-400">Electron</dt>
              <dd>{{ runtimeInfo.versions.electron }}</dd>
            </div>
          </dl>
          <p v-else class="mt-3 text-sm text-slate-400">
            Runtime details will appear after preload responds.
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
