import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ProjectsView from "@/views/ProjectsView.vue";

describe("ProjectsView", () => {
  it("renders the scaffold marker", async () => {
    const wrapper = mount(ProjectsView);

    await flushPromises();

    expect(wrapper.get("[data-testid='projects-view']").text()).toContain(
      "Projects scaffold is ready",
    );
    expect(wrapper.get("[data-testid='app-ready']").text()).toContain("Ready");
  });
});
