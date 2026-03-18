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

describe("ProjectsView in browser mode", () => {
  it("renders project folders in a real browser environment", async () => {
    const wrapper = await mountProjectsView("/projects");

    expect(wrapper.text()).toContain("История дизайна");
    expect(wrapper.text()).toContain("Баухаус");
  });

  it("opens the requested folder from the route query", async () => {
    const wrapper = await mountProjectsView("/projects?folderId=2");

    expect(wrapper.text()).toContain("Японский метаболизм");
    expect(wrapper.text()).not.toContain("Баухаус");
  });
});
