import { shallowRef } from "vue";
import { parseLessonBatch, isYoutubeUrl } from "../utils/lessonBatchParser";

export interface UseProjectLessonActionsOptions {
  projectId: () => number | null;
  onQueueUpdated?: () => Promise<void> | void;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось поставить урок в очередь.";
}

export function useProjectLessonActions(options: UseProjectLessonActionsOptions) {
  const showCreateLessonModal = shallowRef(false);
  const showAddLessonFromAudioModal = shallowRef(false);
  const showAddLessonsListModal = shallowRef(false);

  const createLessonSubmitting = shallowRef(false);
  const createLessonErrorMessage = shallowRef<string | null>(null);
  const addLessonFromAudioSubmitting = shallowRef(false);
  const addLessonFromAudioErrorMessage = shallowRef<string | null>(null);
  const addLessonsListSubmitting = shallowRef(false);
  const addLessonsListErrorMessage = shallowRef<string | null>(null);

  function getRequiredProjectId(): number {
    const projectId = options.projectId();

    if (!projectId) {
      throw new Error("Некорректный идентификатор проекта.");
    }

    return projectId;
  }

  async function notifyQueueUpdated(): Promise<void> {
    await options.onQueueUpdated?.();
  }

  function openCreateLessonModal(): void {
    createLessonErrorMessage.value = null;
    showCreateLessonModal.value = true;
  }

  function openAddLessonFromAudioModal(): void {
    addLessonFromAudioErrorMessage.value = null;
    showAddLessonFromAudioModal.value = true;
  }

  function openAddLessonsListModal(): void {
    addLessonsListErrorMessage.value = null;
    showAddLessonsListModal.value = true;
  }

  function closeCreateLessonModal(): void {
    if (createLessonSubmitting.value) {
      return;
    }

    createLessonErrorMessage.value = null;
    showCreateLessonModal.value = false;
  }

  function closeAddLessonFromAudioModal(): void {
    if (addLessonFromAudioSubmitting.value) {
      return;
    }

    addLessonFromAudioErrorMessage.value = null;
    showAddLessonFromAudioModal.value = false;
  }

  function closeAddLessonsListModal(): void {
    if (addLessonsListSubmitting.value) {
      return;
    }

    addLessonsListErrorMessage.value = null;
    showAddLessonsListModal.value = false;
  }

  async function enqueueYoutubeLesson(payload: {
    lessonName: string;
    youtubeUrl: string;
    pipelineVersionId: number | null;
  }): Promise<void> {
    createLessonSubmitting.value = true;
    createLessonErrorMessage.value = null;

    try {
      if (!isYoutubeUrl(payload.youtubeUrl)) {
        throw new Error("Укажите корректную ссылку на YouTube.");
      }

      await window.electronAPI.lessons.enqueueYoutube({
        lessonName: payload.lessonName.trim(),
        pipelineVersionId: payload.pipelineVersionId,
        projectId: getRequiredProjectId(),
        sourceUrl: payload.youtubeUrl.trim(),
      });
      await notifyQueueUpdated();
      showCreateLessonModal.value = false;
    } catch (error) {
      createLessonErrorMessage.value = toErrorMessage(error);
    } finally {
      createLessonSubmitting.value = false;
    }
  }

  async function enqueueLocalFileLesson(payload: {
    lessonName: string;
    audioFile: File | null;
    pipelineVersionId: number | null;
  }): Promise<void> {
    addLessonFromAudioSubmitting.value = true;
    addLessonFromAudioErrorMessage.value = null;

    try {
      if (!payload.audioFile) {
        throw new Error("Выберите аудио- или видеофайл.");
      }

      const filePath = window.electronAPI.files.getPathForFile(payload.audioFile);

      if (!filePath) {
        throw new Error("Не удалось получить путь к выбранному файлу.");
      }

      await window.electronAPI.lessons.enqueueLocalFile({
        filePath,
        lessonName: payload.lessonName.trim(),
        pipelineVersionId: payload.pipelineVersionId,
        projectId: getRequiredProjectId(),
      });
      await notifyQueueUpdated();
      showAddLessonFromAudioModal.value = false;
    } catch (error) {
      addLessonFromAudioErrorMessage.value = toErrorMessage(error);
    } finally {
      addLessonFromAudioSubmitting.value = false;
    }
  }

  async function enqueueYoutubeBatch(payload: {
    lessonsList: string;
  }): Promise<void> {
    addLessonsListSubmitting.value = true;
    addLessonsListErrorMessage.value = null;

    try {
      const items = parseLessonBatch(payload.lessonsList);

      await window.electronAPI.lessons.enqueueYoutubeBatch({
        items,
        pipelineVersionId: null,
        projectId: getRequiredProjectId(),
      });
      await notifyQueueUpdated();
      showAddLessonsListModal.value = false;
    } catch (error) {
      addLessonsListErrorMessage.value = toErrorMessage(error);
    } finally {
      addLessonsListSubmitting.value = false;
    }
  }

  return {
    addLessonFromAudioErrorMessage,
    addLessonFromAudioSubmitting,
    addLessonsListErrorMessage,
    addLessonsListSubmitting,
    closeAddLessonFromAudioModal,
    closeAddLessonsListModal,
    closeCreateLessonModal,
    createLessonErrorMessage,
    createLessonSubmitting,
    enqueueLocalFileLesson,
    enqueueYoutubeBatch,
    enqueueYoutubeLesson,
    openAddLessonFromAudioModal,
    openAddLessonsListModal,
    openCreateLessonModal,
    showAddLessonFromAudioModal,
    showAddLessonsListModal,
    showCreateLessonModal,
  };
}
