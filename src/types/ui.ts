export type ThemeMode = "light" | "dark";

export interface BreadcrumbItem {
  label: string;
  to?: string;
  current?: boolean;
}

export interface FolderProjectItem {
  id: number;
  name: string;
  lessonsCount: number;
  durationLabel: string;
  to: string;
}

export interface FolderItem {
  id: number;
  name: string;
  projectsCount: number;
  isOpen: boolean;
  isHidden?: boolean;
  projects: FolderProjectItem[];
}

export type LessonSortValue = "created_at" | "name";

export interface LessonSortOption {
  value: LessonSortValue;
  label: string;
}

export interface PipelineVersionOption {
  id: number;
  label: string;
  description?: string;
}

export interface YoutubeDuplicateLessonWarning {
  projectName: string;
  lessonName: string;
  projectTo: string;
}

export type LessonAudioStatus = "queued" | "running" | "loaded" | "failed";

export type PipelineRunStatus =
  | "done"
  | "queued"
  | "running"
  | "paused"
  | "failed"
  | "unknown";

export interface LessonPipelineRunItem {
  id: number;
  title: string;
  versionLabel: string;
  status: PipelineRunStatus;
}

export interface LessonItem {
  id: number;
  name: string;
  createdAtOrder: number;
  sourceUrl?: string;
  audioStatus: LessonAudioStatus;
  audioDurationLabel?: string;
  audioErrorTooltip?: string;
  pipelineRuns: LessonPipelineRunItem[];
}

export interface ProjectDetails {
  id: number;
  name: string;
  durationLabel?: string;
  lessons: LessonItem[];
}
