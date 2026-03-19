import { describe, expect, it } from "vitest";
import { ApiClientError } from "@electron/main/services/api/apiClient";
import { mapLessonUploadErrorMessage } from "@electron/main/services/queue/media";

describe("lesson upload error messages", () => {
  it("maps API authorization and validation errors to user-facing messages", () => {
    expect(
      mapLessonUploadErrorMessage(
        new ApiClientError("Unauthorized.", {
          status: 401,
        }),
      ),
    ).toBe("Текущий токен больше не подходит. Откройте настройки и введите новый.");

    expect(
      mapLessonUploadErrorMessage(
        new ApiClientError("Not Found.", {
          status: 404,
        }),
      ),
    ).toBe("Проект не найден или больше недоступен.");

    expect(
      mapLessonUploadErrorMessage(
        new ApiClientError("Validation failed.", {
          status: 422,
          body: {
            message: "Сервер отклонил урок. Проверьте название и параметры.",
          },
        }),
      ),
    ).toBe("Сервер отклонил урок. Проверьте название и параметры.");
  });

  it("maps network failures to a retry-friendly message", () => {
    expect(
      mapLessonUploadErrorMessage(new TypeError("fetch failed")),
    ).toBe("Не удалось соединиться с сервером. Проверьте подключение и повторите попытку.");
  });
});
