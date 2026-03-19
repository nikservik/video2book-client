export interface ParsedLessonBatchItem {
  lessonName: string;
  sourceUrl: string;
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "").replace(/^m\./, "").toLowerCase();
}

export function isYoutubeUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value.trim());
    const normalizedHostname = normalizeHostname(parsedUrl.hostname);

    return (
      normalizedHostname === "youtu.be" ||
      normalizedHostname === "youtube.com" ||
      normalizedHostname.endsWith(".youtube.com")
    );
  } catch {
    return false;
  }
}

export function parseLessonBatch(text: string): ParsedLessonBatchItem[] {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Добавьте хотя бы один урок в список.");
  }

  if (lines.length % 2 !== 0) {
    throw new Error("Список уроков должен состоять из пар строк: название и ссылка.");
  }

  const items: ParsedLessonBatchItem[] = [];

  for (let index = 0; index < lines.length; index += 2) {
    const lessonName = lines[index] ?? "";
    const sourceUrl = lines[index + 1] ?? "";

    if (!isYoutubeUrl(sourceUrl)) {
      throw new Error(`Строка ${index + 2}: укажите корректную ссылку на YouTube.`);
    }

    items.push({
      lessonName,
      sourceUrl,
    });
  }

  return items;
}
