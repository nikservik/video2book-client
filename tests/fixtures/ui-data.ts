import type { ProjectScreenData, ProjectsListData } from "@electron/shared/dto/projects";
import {
  foldersMock,
  pipelineVersionOptionsMock,
  projectMock,
} from "@/data/mockUi";

export const projectsListDataMock: ProjectsListData = {
  folders: foldersMock,
};

export function createProjectScreenDataMock(projectId = 101): ProjectScreenData {
  const matchedFolder = foldersMock.find((folder) => {
    return folder.projects.some((project) => project.id === projectId);
  });
  const matchedProject = matchedFolder?.projects.find((project) => project.id === projectId);

  return {
    parentFolderId: matchedFolder?.id ?? 1,
    pipelineVersions: pipelineVersionOptionsMock,
    project: {
      ...projectMock,
      id: matchedProject?.id ?? projectMock.id,
      name: matchedProject?.name ?? projectMock.name,
      durationLabel: matchedProject?.durationLabel ?? projectMock.durationLabel,
    },
  };
}
