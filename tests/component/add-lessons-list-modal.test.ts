import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AddLessonsListModal from "@/components/project/modals/AddLessonsListModal.vue";

describe("AddLessonsListModal", () => {
  it("shows validation error when the list is empty", async () => {
    const wrapper = mount(AddLessonsListModal, {
      props: {
        open: true,
      },
    });

    await wrapper.get("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain("Добавьте хотя бы один урок в список.");
    expect(wrapper.emitted("save")).toBeUndefined();
  });

  it("emits save with the raw lessons list", async () => {
    const wrapper = mount(AddLessonsListModal, {
      props: {
        open: true,
      },
    });

    await wrapper.get("#project-lessons-list").setValue(`Урок 1
https://www.youtube.com/watch?v=abc123`);
    await wrapper.get("form").trigger("submit.prevent");

    expect(wrapper.emitted("save")).toEqual([
      [
        {
          lessonsList: `Урок 1
https://www.youtube.com/watch?v=abc123`,
        },
      ],
    ]);
  });
});
