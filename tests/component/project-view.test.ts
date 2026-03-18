import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import router from "@/router";
import ProjectView from "@/views/ProjectView.vue";

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

    expect(wrapper.text()).toContain("Японский метаболизм");
    expect(wrapper.text()).toContain("Добавить урок из аудио/видео");

    const projectsBreadcrumb = wrapper.find('a[href="#/projects?folderId=2"]');

    expect(projectsBreadcrumb.exists()).toBe(true);
    expect(projectsBreadcrumb.text()).toBe("Проекты");
  });
});
