import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ProjectsView from "@/views/ProjectsView.vue";

describe("ProjectsView in browser mode", () => {
  it("renders the scaffold shell in a real browser environment", async () => {
    const wrapper = mount(ProjectsView);

    await flushPromises();

    expect(wrapper.get("[data-testid='app-ready']").text()).toBe("Ready");
  });
});
