import type {
  FolderItem,
  LessonSortOption,
  PipelineVersionOption,
  ProjectDetails,
  YoutubeDuplicateLessonWarning,
} from "../types/ui";

export const lessonSortOptionsMock: LessonSortOption[] = [
  {
    value: "created_at",
    label: "Сортировка по дате добавления",
  },
  {
    value: "name",
    label: "Сортировка по названию",
  },
];

export const pipelineVersionOptionsMock: PipelineVersionOption[] = [
  {
    id: 7,
    label: "Базовый шаблон • v5",
    description: "Расшифровка, чистка и базовая структура текста.",
  },
  {
    id: 8,
    label: "Глоссарий • v2",
    description: "Извлечение терминов и кратких пояснений.",
  },
  {
    id: 9,
    label: "Конспект • v1",
    description: "Краткий конспект с заголовками и тезисами.",
  },
];

export const youtubeDuplicateLessonWarningMock: YoutubeDuplicateLessonWarning = {
  projectName: "Модернизм",
  lessonName: "01. Введение",
  projectTo: "/projects/102",
};

export const foldersMock: FolderItem[] = [
  {
    id: 1,
    name: "История дизайна",
    projectsCount: 2,
    isOpen: true,
    projects: [
      {
        id: 101,
        name: "Баухаус",
        lessonsCount: 14,
        durationLabel: "08:30:12",
        to: "/projects/101",
      },
      {
        id: 102,
        name: "Модернизм",
        lessonsCount: 9,
        durationLabel: "05:12:48",
        to: "/projects/102",
      },
    ],
  },
  {
    id: 2,
    name: "Архитектура",
    projectsCount: 3,
    isOpen: false,
    projects: [
      {
        id: 201,
        name: "Японский метаболизм",
        lessonsCount: 7,
        durationLabel: "03:41:10",
        to: "/projects/201",
      },
      {
        id: 202,
        name: "Брутализм",
        lessonsCount: 11,
        durationLabel: "06:01:27",
        to: "/projects/202",
      },
      {
        id: 203,
        name: "Постмодернизм",
        lessonsCount: 5,
        durationLabel: "02:54:09",
        to: "/projects/203",
      },
    ],
  },
  {
    id: 3,
    name: "Скрытые проекты",
    projectsCount: 1,
    isOpen: false,
    isHidden: true,
    projects: [
      {
        id: 301,
        name: "Внутренний архив",
        lessonsCount: 4,
        durationLabel: "01:48:33",
        to: "/projects/301",
      },
    ],
  },
];

export const projectMock: ProjectDetails = {
  id: 101,
  name: "Баухаус",
  durationLabel: "08:30:12",
  lessons: [
    {
      id: 1,
      name: "01. Введение",
      createdAtOrder: 1,
      sourceUrl: "https://example.com/source/lesson-1",
      audioStatus: "loaded",
      audioDurationLabel: "18:24",
      pipelineRuns: [
        {
          id: 1001,
          title: "Базовый шаблон",
          versionLabel: "v5",
          status: "done",
        },
      ],
    },
    {
      id: 2,
      name: "02. Ранний период",
      createdAtOrder: 2,
      sourceUrl: "https://example.com/source/lesson-2",
      audioStatus: "running",
      pipelineRuns: [
        {
          id: 1002,
          title: "Базовый шаблон",
          versionLabel: "v5",
          status: "running",
        },
      ],
    },
    {
      id: 3,
      name: "03. Школа и преподаватели",
      createdAtOrder: 3,
      sourceUrl: "https://example.com/source/lesson-3",
      audioStatus: "failed",
      audioErrorTooltip: "Ошибка загрузки аудио",
      pipelineRuns: [
        {
          id: 1003,
          title: "Базовый шаблон",
          versionLabel: "v5",
          status: "failed",
        },
      ],
    },
    {
      id: 4,
      name: "04. Типографика",
      createdAtOrder: 4,
      sourceUrl: "https://example.com/source/lesson-4",
      audioStatus: "queued",
      pipelineRuns: [
        {
          id: 1004,
          title: "Базовый шаблон",
          versionLabel: "v5",
          status: "queued",
        },
        {
          id: 1005,
          title: "Глоссарий",
          versionLabel: "v2",
          status: "paused",
        },
      ],
    },
    {
      id: 5,
      name: "05. Наследие",
      createdAtOrder: 5,
      sourceUrl: "https://example.com/source/lesson-5",
      audioStatus: "loaded",
      audioDurationLabel: "24:51",
      pipelineRuns: [],
    },
  ],
};
