import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import router from "@/router";
import ProjectView from "@/views/ProjectView.vue";
import { createProjectScreenDataMock } from "@tests/fixtures/ui-data";

async function mountProjectView(path: string) {
  await router.push(path);
  await router.isReady();

  const wrapper = mount(ProjectView, {
    global: {
      plugins: [router],
    },
  });

  await flushPromises();

  return wrapper;
}

describe("ProjectView", () => {
  it("restores the parent folder in the projects breadcrumb link", async () => {
    const wrapper = await mountProjectView("/projects/201");

    expect(window.electronAPI.projects.getLessons).toHaveBeenCalledWith(201);
    expect(wrapper.text()).toContain("Японский метаболизм");
    expect(wrapper.text()).toContain("Добавить урок из аудио/видео");

    const projectsBreadcrumb = wrapper.find('a[href="#/projects?folderId=2"]');

    expect(projectsBreadcrumb.exists()).toBe(true);
    expect(projectsBreadcrumb.text()).toBe("Проекты");
  });

  it("merges queued placeholder lessons into the project list", async () => {
    vi.mocked(window.electronAPI.queue.getSnapshot).mockResolvedValueOnce({
      jobs: [
        {
          id: "queue-youtube-queued",
          projectId: 201,
          lessonName: "Новый placeholder урок",
          pipelineVersionId: null,
          kind: "youtube",
          sourceUrl: "https://youtu.be/placeholder",
          sourceFilePath: null,
          status: "running",
          stage: "download",
          errorMessage: null,
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
          workspaceDir: "/tmp/queue-youtube-queued",
          createdLesson: null,
        },
      ],
    });

    const wrapper = await mountProjectView("/projects/201");

    expect(wrapper.text()).toContain("Новый placeholder урок");
    expect(wrapper.text()).toContain("Скачиваем аудио с YouTube");
    expect(wrapper.text()).toContain("Шаблоны появятся после создания урока");
  });

  it("refreshes the project after the queue exposes a created lesson missing from the API response", async () => {
    const firstProjectScreen = createProjectScreenDataMock(201);
    const createdLesson = {
      id: 777,
      name: "Синхронизированный урок",
      createdAtOrder: 777,
      audioStatus: "running" as const,
      pipelineRuns: [],
    };
    const secondProjectScreen = {
      ...firstProjectScreen,
      project: {
        ...firstProjectScreen.project,
        lessons: [...firstProjectScreen.project.lessons, createdLesson],
      },
    };

    vi.mocked(window.electronAPI.projects.getLessons)
      .mockResolvedValueOnce(firstProjectScreen)
      .mockResolvedValueOnce(secondProjectScreen);
    vi.mocked(window.electronAPI.queue.getSnapshot).mockResolvedValueOnce({
      jobs: [
        {
          id: "queue-youtube-created",
          projectId: 201,
          lessonName: "Синхронизированный урок",
          pipelineVersionId: null,
          kind: "youtube",
          sourceUrl: "https://youtu.be/synced",
          sourceFilePath: null,
          status: "done",
          stage: null,
          errorMessage: null,
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:05.000Z",
          workspaceDir: "/tmp/queue-youtube-created",
          createdLesson,
        },
      ],
    });

    const wrapper = await mountProjectView("/projects/201");

    await flushPromises();

    expect(window.electronAPI.projects.getLessons).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Синхронизированный урок");
  });
});
