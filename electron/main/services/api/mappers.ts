import type { components } from "@electron/shared/api/schema";
import type { ProjectScreenData } from "@electron/shared/dto/projects";
import type {
  FolderItem,
  FolderProjectItem,
  LessonItem,
  LessonPipelineRunItem,
  PipelineVersionOption,
  ProjectDetails,
} from "../../../../src/types/ui";

type ApiFoldersResponse = components["schemas"]["FoldersResponse"];
type ApiFolder = components["schemas"]["FolderWithProjects"];
type ApiProject = components["schemas"]["Project"];
type ApiPipelineVersionOption = components["schemas"]["PipelineVersionOption"];
type ApiProjectLessonsResponse = components["schemas"]["ProjectLessonsResponse"];
type ApiProjectLessonCreateResponse =
  components["schemas"]["ProjectLessonCreateResponse"];
type ApiLesson = components["schemas"]["Lesson"];
type ApiPipelineRunSummary = components["schemas"]["PipelineRunSummary"];

function mapFolderProject(project: ApiProject): FolderProjectItem {
  return {
    id: project.id,
    name: project.name,
    lessonsCount: project.lessons_count,
    durationLabel: project.duration_label ?? "—",
    to: `/projects/${project.id}`,
  };
}

function extractPipelineVersionLabel(run: ApiPipelineRunSummary): string {
  if (run.pipeline_version !== null) {
    return `v${run.pipeline_version}`;
  }

  if (run.pipeline_title && run.pipeline_label) {
    const prefix = `${run.pipeline_title} • `;

    if (run.pipeline_label.startsWith(prefix)) {
      return run.pipeline_label.slice(prefix.length);
    }
  }

  return run.pipeline_label ?? "—";
}

function mapPipelineRun(run: ApiPipelineRunSummary): LessonPipelineRunItem {
  return {
    id: run.id,
    title: run.pipeline_title ?? run.pipeline_label ?? "Без названия",
    versionLabel: extractPipelineVersionLabel(run),
    status: run.status,
  };
}

function resolveLessonOrder(lesson: ApiLesson): number {
  const timestamp = lesson.runs
    .map((run) => {
      return run.created_at ? Date.parse(run.created_at) : Number.NaN;
    })
    .find((value) => Number.isFinite(value));

  if (timestamp !== undefined && Number.isFinite(timestamp)) {
    return timestamp;
  }

  return lesson.id;
}

function mapLesson(lesson: ApiLesson): LessonItem {
  return {
    id: lesson.id,
    name: lesson.name,
    createdAtOrder: resolveLessonOrder(lesson),
    sourceUrl: lesson.source_url ?? undefined,
    audioStatus: lesson.download_status,
    audioDurationLabel: lesson.audio_duration_label ?? undefined,
    pipelineRuns: lesson.runs.map(mapPipelineRun),
  };
}

function mapProjectDetails(
  project: ApiProject,
  lessons: ApiLesson[],
): ProjectDetails {
  return {
    id: project.id,
    name: project.name,
    durationLabel: project.duration_label ?? undefined,
    lessons: lessons.map(mapLesson),
  };
}

function mapPipelineVersion(
  option: ApiPipelineVersionOption,
): PipelineVersionOption {
  return {
    id: option.id,
    label: option.label,
    description: option.description ?? undefined,
  };
}

export function mapFoldersResponse(response: ApiFoldersResponse): FolderItem[] {
  return response.data.map((folder: ApiFolder, index) => ({
    id: folder.id,
    name: folder.name,
    projectsCount: folder.projects_count,
    isOpen: index === 0,
    isHidden: folder.hidden || undefined,
    projects: folder.projects.map(mapFolderProject),
  }));
}

export function mapProjectLessonsResponse(
  response: ApiProjectLessonsResponse,
): ProjectScreenData {
  return {
    parentFolderId: response.data.project.folder_id,
    project: mapProjectDetails(response.data.project, response.data.lessons),
    pipelineVersions: response.data.pipeline_versions.map(mapPipelineVersion),
  };
}

export function mapCreatedLessonResponse(
  response: ApiProjectLessonCreateResponse,
): LessonItem {
  return mapLesson(response.data.lesson);
}
