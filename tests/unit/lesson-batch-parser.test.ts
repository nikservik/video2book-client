import { describe, expect, it } from "vitest";
import { isYoutubeUrl, parseLessonBatch } from "@/utils/lessonBatchParser";

describe("lesson batch parser", () => {
  it("accepts youtube.com and youtu.be links", () => {
    expect(isYoutubeUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(isYoutubeUrl("https://youtu.be/abc123")).toBe(true);
    expect(isYoutubeUrl("https://example.com/watch?v=abc123")).toBe(false);
  });

  it("parses lessons from title/url pairs", () => {
    expect(
      parseLessonBatch(`Урок 1
https://www.youtube.com/watch?v=abc123

Урок 2
https://youtu.be/def456`),
    ).toEqual([
      {
        lessonName: "Урок 1",
        sourceUrl: "https://www.youtube.com/watch?v=abc123",
      },
      {
        lessonName: "Урок 2",
        sourceUrl: "https://youtu.be/def456",
      },
    ]);
  });

  it("throws a readable error for incomplete pairs", () => {
    expect(() => {
      parseLessonBatch(`Урок 1
https://www.youtube.com/watch?v=abc123

Урок 2`);
    }).toThrow("Список уроков должен состоять из пар строк: название и ссылка.");
  });
});
