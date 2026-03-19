import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import router from "@/router";
import ProjectsView from "@/views/ProjectsView.vue";

async function mountProjectsView(path: string) {
  await router.push(path);
  await router.isReady();

  const wrapper = mount(ProjectsView, {
    global: {
      plugins: [router],
    },
  });

  await flushPromises();

  return wrapper;
}

describe("ProjectsView", () => {
  it("renders folders and projects from mock UI", async () => {
    const wrapper = await mountProjectsView("/projects");

    expect(wrapper.text()).toContain("Добавление уроков в проекты");
    expect(window.electronAPI.projects.list).toHaveBeenCalled();
    expect(wrapper.text()).toContain("История дизайна");
    expect(wrapper.text()).toContain("Баухаус");
    expect(wrapper.text()).toContain("Модернизм");
  });

  it("keeps only one folder open at a time", async () => {
    const wrapper = await mountProjectsView("/projects");
    const folderHeaders = wrapper.findAll("section > div.cursor-pointer");

    expect(wrapper.text()).toContain("Баухаус");

    await folderHeaders[1].trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Японский метаболизм");
    expect(wrapper.text()).not.toContain("Баухаус");
  });

  it("opens the folder from the route query", async () => {
    const wrapper = await mountProjectsView("/projects?folderId=2");

    expect(wrapper.text()).toContain("Архитектура");
    expect(wrapper.text()).toContain("Японский метаболизм");
    expect(wrapper.text()).not.toContain("Баухаус");
  });
});
