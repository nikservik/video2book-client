<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useScaffoldProbe } from "../composables/useScaffoldProbe";

const route = useRoute();
const { runtimeInfo, status } = useScaffoldProbe();

const projectId = computed(() => route.params.projectId ?? "unknown");
</script>

<template>
  <section class="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
    <div class="w-full rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/30">
      <p class="text-sm font-medium uppercase tracking-[0.3em] text-fuchsia-300">
        Phase 1
      </p>
      <h1 class="mt-4 text-4xl font-semibold tracking-tight">
        Project route scaffold
      </h1>
      <p class="mt-4 text-base leading-7 text-slate-300">
        Current placeholder route: <span class="font-semibold text-white">/projects/{{ projectId }}</span>
      </p>

      <div class="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <p class="text-sm font-medium text-slate-300">Renderer status</p>
        <p class="mt-3 text-sm text-slate-200">
          Preload handshake status:
          <span class="font-semibold text-white">{{ status }}</span>
        </p>
        <p v-if="runtimeInfo" class="mt-2 text-sm text-slate-400">
          Node {{ runtimeInfo.versions.node }} on {{ runtimeInfo.platform }}
        </p>
      </div>
    </div>
  </section>
</template>
