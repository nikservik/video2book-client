import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CreateLessonModal from "@/components/project/modals/CreateLessonModal.vue";

const pipelineVersionOptions = [
  {
    id: 7,
    label: "Базовый шаблон • v3",
    description: "Базовая обработка лекции",
  },
];

describe("CreateLessonModal", () => {
  it("shows validation errors and does not emit save for empty fields", async () => {
    const wrapper = mount(CreateLessonModal, {
      props: {
        open: true,
        pipelineVersionOptions,
      },
    });

    await wrapper.get("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain("Введите название урока.");
    expect(wrapper.text()).toContain("Укажите ссылку на YouTube.");
    expect(wrapper.emitted("save")).toBeUndefined();
  });

  it("emits save for a valid lesson", async () => {
    const wrapper = mount(CreateLessonModal, {
      props: {
        open: true,
        pipelineVersionOptions,
      },
    });

    await wrapper.get("#lesson-name").setValue("Новый урок");
    await wrapper.get("#lesson-youtube-url").setValue("https://youtu.be/abc123");
    await wrapper.get("form").trigger("submit.prevent");

    expect(wrapper.emitted("save")).toEqual([
      [
        {
          lessonName: "Новый урок",
          youtubeUrl: "https://youtu.be/abc123",
          pipelineVersionId: 7,
        },
      ],
    ]);
  });
});
