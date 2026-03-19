import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AddLessonFromAudioModal from "@/components/project/modals/AddLessonFromAudioModal.vue";

const pipelineVersionOptions = [
  {
    id: 7,
    label: "Базовый шаблон • v3",
    description: "Базовая обработка лекции",
  },
];

describe("AddLessonFromAudioModal", () => {
  it("shows validation errors and does not emit save without form data", async () => {
    const wrapper = mount(AddLessonFromAudioModal, {
      props: {
        open: true,
        pipelineVersionOptions,
      },
    });

    await wrapper.get("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain("Введите название урока.");
    expect(wrapper.text()).toContain("Выберите аудио- или видеофайл.");
    expect(wrapper.emitted("save")).toBeUndefined();
  });

  it("emits save for a valid file selection", async () => {
    const wrapper = mount(AddLessonFromAudioModal, {
      props: {
        open: true,
        pipelineVersionOptions,
      },
    });
    const file = new File(["audio"], "lesson.mp3", {
      type: "audio/mpeg",
    });
    const input = wrapper.get<HTMLInputElement>("#lesson-audio-file");

    await wrapper.get("#audio-lesson-name").setValue("Локальный урок");
    Object.defineProperty(input.element, "files", {
      value: [file],
      configurable: true,
    });
    await input.trigger("change");
    await wrapper.get("form").trigger("submit.prevent");

    expect(wrapper.emitted("save")).toEqual([
      [
        {
          lessonName: "Локальный урок",
          audioFile: file,
          pipelineVersionId: 7,
        },
      ],
    ]);
  });
});
