import type {
  FolderItem,
  PipelineVersionOption,
  ProjectDetails,
} from "../../../src/types/ui";

export interface ProjectsListData {
  folders: FolderItem[];
}

export interface ProjectScreenData {
  parentFolderId: number;
  project: ProjectDetails;
  pipelineVersions: PipelineVersionOption[];
}
