# План реализации desktop-клиента Video2Book

Дата: 2026-03-18

Этот план опирается на решения из `docs/architecture.md`. На этапе реализации не должно остаться выборов по стеку, пакетам, модели очереди или границам процессов.

## 1. Зафиксированные решения

Перед стартом считаем принятым следующее:

- стек: Electron + `electron-vite` + Vue 3 + Vue Router + Tailwind CSS 4 + `electron-builder`;
- тестовый стек: `vitest` + `@vue/test-utils` + `vitest` Browser Mode + Playwright + Prism + MSW;
- renderer без `Pinia`;
- сеть только из main process;
- настройки сервера и токен только в main process;
- очередь одна, глобальная, с concurrency `1`;
- состояние очереди хранится в JSON в `userData`;
- все внешние утилиты пакуются внутрь приложения;
- `yt-dlp` запускается только вместе с bundled `deno`;
- локально произведённый аудиофайл всегда приводится к MP3;
- все основные тесты должны запускаться локально без CI;
- production release только с signing/notarization;
- v1 без auto-update.

## 2. Состояние API после обновления

После обновления `docs/client-api.yaml` у клиента уже есть все обязательные данные для двух экранов.

Что подтверждено в текущей спецификации:

- `GET /api/projects/{project}/lessons` возвращает `project`, `lessons`, `pipeline_versions`;
- `Lesson` содержит `source_url`;
- `POST /api/projects/{project}/lessons` возвращает `Lesson` в той же актуальной схеме.

Вывод: реальную интеграцию можно делать без ожидания дополнительных backend-изменений.

### 2.1 Что остаётся вне реального API потока v1

Проверка дубликатов YouTube-ссылок до сохранения не является блокером. В v1 `duplicateLessonWarning` остаётся неактивным реальным источником данных.

## 3. Порядок работ

Работа идёт строго по фазам ниже. Следующая фаза начинается только после выполнения definition of done предыдущей.

## 4. Фаза 1. Scaffold и базовая desktop-сборка

### Цель

Поднять пустой, но рабочий Electron/Vue/Tailwind проект с корректной структурой и dev/build pipeline.

### Делаем

- инициализируем проект на `pnpm`;
- добавляем зависимости:
  - `electron`
  - `electron-vite`
  - `electron-builder`
  - `typescript`
  - `vue`
  - `vue-router`
  - `@vitejs/plugin-vue`
  - `vue-tsc`
  - `tailwindcss`
  - `@tailwindcss/vite`
  - `openapi-fetch`
  - `openapi-typescript`
  - `vitest`
  - `@vitest/coverage-v8`
  - `@vitest/browser-playwright`
  - `@vue/test-utils`
  - `jsdom`
  - `@playwright/test`
  - `playwright`
  - `msw`
  - `@stoplight/prism-cli`
- создаём структуру:
  - `electron/main`
  - `electron/preload`
  - `electron/shared`
  - `src/...` по `docs/client-ui.md`
  - `tests/unit`
  - `tests/integration`
  - `tests/component`
  - `tests/browser`
  - `tests/e2e`
  - `tests/contract`
  - `tests/fixtures/media`
- фиксируем использование уже подготовленных иконок из `build/icons`:
  - `build/icons/icon.png` как базовый source asset;
  - `build/icons/mac/icon.icns` для macOS;
  - `build/icons/win/icon.ico` для Windows;
- если исходная иконка меняется, регенерация набора идёт через `pnpm build:icons`;
- настраиваем `electron.vite.config.ts` так, чтобы renderer root был именно `src`, а не альтернативная структура;
- настраиваем `contextIsolation: true`, `nodeIntegration: false`;
- настраиваем тестовый фундамент сразу:
  - `vitest` projects для `node`, `component`, `browser`;
  - coverage через `@vitest/coverage-v8`;
  - Playwright config для Electron E2E и trace/screenshot artifacts;
  - Prism command для `docs/client-api.yaml`;
  - общие test fixtures и helpers;
- добавляем базовые `pnpm`-скрипты:
  - `dev`
  - `build`
  - `typecheck`
  - `generate:openapi`
  - `prepare:binaries`
  - `build:icons`
  - `test`
  - `test:watch`
  - `test:unit`
  - `test:integration`
  - `test:component`
  - `test:browser`
  - `test:e2e`
  - `test:contract`
  - `test:all`
  - `test:smoke:youtube`
  - `dist:mac:x64`
  - `dist:mac:arm64`
  - `dist:win:x64`

### Definition of done

- `pnpm dev` открывает пустое окно приложения;
- renderer собирается через Vite;
- main и preload собираются отдельно;
- локально запускается пустой smoke-test в каждом тестовом слое:
  - `vitest` node;
  - `vitest` component;
  - `vitest` browser;
  - `playwright` electron;
  - `prism` mock server;
- `pnpm build` проходит без ошибок.

## 5. Фаза 2. Полное воспроизведение UI на mock data

### Цель

Сначала собрать интерфейс в точности по `docs/client-ui.md`, вообще не завися от реального API.

### Делаем

- переносим файлы из обязательной структуры `docs/client-ui.md`;
- создаём:
  - `src/assets/main.css`
  - `src/types/ui.ts`
  - `src/composables/useTheme.ts`
  - все `ui`, `project`, `projects`, `views`, `router` файлы из спеки;
- копируем `favicon.png`;
- подключаем mock data из `src/data/mockUi.ts`;
- убеждаемся, что:
  - header;
  - breadcrumbs;
  - projects list;
  - project layout;
  - 3 модалки;
  - mobile actions panel
  визуально совпадают со спецификацией.

### Definition of done

- оба view работают целиком на mock data;
- выполнен checklist из раздела 21 в `docs/client-ui.md`;
- нет привязки ни к Electron IPC, ни к реальному API.

## 6. Фаза 3. Shared contracts и typed API слой

### Цель

Подготовить стабильные общие типы и единый main-process API client.

### Делаем

- добавляем `scripts/generate-openapi.ts`;
- генерируем `electron/shared/api/schema.ts` из `docs/client-api.yaml`;
- создаём `ApiClient` на `openapi-fetch`;
- создаём mapper-функции:
  - folders -> UI folders;
  - project lessons -> `ProjectScreenData` (`project` + `pipelineVersions`);
  - created lesson -> UI lesson;
- отдельно создаём IPC DTO для renderer, чтобы renderer не импортировал низкоуровневые OpenAPI-ответы.
- добавляем contract-тесты, которые проверяют client mapping поверх актуальной OpenAPI-схемы и `Prism mock`.

### Definition of done

- `pnpm generate:openapi` детерминированно обновляет типы;
- main process умеет типобезопасно вызывать все текущие endpoint’ы из OpenAPI;
- все преобразования API -> UI лежат в одном месте.
- `test:contract` локально подтверждает, что базовые клиентские запросы и маппинг совместимы со спецификацией.

## 7. Фаза 4. Settings dialog и secure config

### Цель

Сделать первый рабочий сценарий подключения к удалённому серверу.

### Делаем

- создаём desktop-specific settings dialog;
- сохраняем `serverUrl` и `accessToken` в `userData/config.json`;
- шифруем token через `safeStorage`;
- реализуем IPC:
  - `settings.get`
  - `settings.save`
  - `settings.testConnection`
- `testConnection` вызывает `GET /api/folders`;
- добавляем поведение первого запуска:
  - если настроек нет, модалка открывается автоматически;
  - пока настройки невалидны, рабочие действия недоступны.

### Definition of done

- пользователь может ввести URL и token;
- приложение переживает перезапуск и помнит настройки;
- `GET /api/folders` проходит с сохранёнными настройками.

## 8. Фаза 5. Read-only интеграция двух экранов

### Цель

Подключить оба обязательных view к реальному API без очереди и без записи.

### Делаем

- `ProjectsView` загружает `/api/folders`;
- `ProjectView` загружает `/api/projects/{project}/lessons`;
- добавляем loading/error/empty state без изменения геометрии UI;
- source link показываем на основании `lesson.source_url`;
- dropdown версий шаблонов наполняем из `data.pipeline_versions`;
- все запросы идут через main -> preload -> renderer.
- добавляем локальные read-only desktop E2E against `Prism mock`.

### Definition of done

- список проектов открывается на реальных данных;
- список уроков проекта открывается на реальных данных;
- страница проекта получает pipeline options без отдельного запроса;
- renderer не знает token и не делает прямых HTTP-запросов.
- read-only happy path проходит локально в desktop E2E.

## 9. Фаза 6. Управление бинарниками и runtime-путями

### Цель

Подготовить полностью self-contained media toolchain.

### Делаем

- подключаем:
  - `ffmpeg-ffprobe-static`
  - `yt-dlp-wrap`
  - `deno`
- создаём `scripts/prepare-binaries.ts`;
- в этом скрипте:
  - резолвим локальные пути `ffmpeg`, `ffprobe`, `deno`;
  - скачиваем pinned official `yt-dlp` binary;
  - копируем всё в `build/bin`;
- фиксируем единый способ запуска `yt-dlp`: только с `--js-runtimes deno:<bundled-path>`;
- настраиваем `electron-builder.extraResources` на копирование `build/bin` в packaged `resources/bin`;
- пишем `BinaryResolver`, который умеет одинаково работать в dev и packaged mode.
- добавляем локальные тесты на `BinaryResolver` и на наличие обязательных бинарников в dev/build сценариях.

### Definition of done

- в dev режиме main process находит все 4 бинарника;
- в packaged app пути идут через `process.resourcesPath/bin`;
- приложение не зависит от системного PATH пользователя.
- тесты на резолвинг бинарников проходят локально.

## 10. Фаза 7. Persistent queue и media services

### Цель

Реализовать устойчивую очередь локальной подготовки уроков.

### Делаем

- создаём `QueueRepository` с `state.json`;
- создаём `JobWorkspace` внутри `userData/queue/jobs/<id>`;
- создаём `QueueRunner` с concurrency `1`;
- создаём сервисы:
  - `YoutubeDownloader`
  - `LocalMediaInspector`
  - `AudioTranscoder`
  - `LessonUploader`
- вводим stage model:
  - `download`
  - `transcode`
  - `upload`
  - `sync`
- реализуем правила:
  - local audio acceptable -> upload as is;
  - local video -> ffmpeg to mp3;
  - unsupported audio -> ffmpeg to mp3;
  - youtube -> yt-dlp audio-only -> mp3 -> upload;
- валидируем итоговый аудиофайл на лимит 500 MB перед upload;
- сохраняем `stderr.log` в workspace job.
- покрываем это локальными integration-тестами:
  - реальные маленькие audio/video fixtures;
  - temp workspace в файловой системе;
  - mocked `yt-dlp` по умолчанию;
  - отдельный manual live smoke для `yt-dlp`.

### Definition of done

- можно enqueue локальную или YouTube-задачу без UI;
- runner последовательно обрабатывает задания;
- после перезапуска приложения незавершённые задания возвращаются в `queued` и продолжаются.
- queue/media integration suite проходит локально без ручных действий.

## 11. Фаза 8. Интеграция модалок с очередью

### Цель

Подключить три модалки страницы проекта к реальной логике.

### Делаем

- `Добавить урок`:
  - валидируем title + YouTube URL;
  - создаём queue job;
- `Добавить урок из аудио`:
  - UI-имя сохраняется, но модалка принимает и аудио-, и видеофайлы;
  - получаем filesystem path из `File` через preload `webUtils.getPathForFile`;
  - создаём queue job;
- `Добавить список уроков`:
  - парсим textarea как набор пар `название -> URL`;
  - создаём пачку queue jobs;
- добавляем user-friendly ошибки парсинга и валидации до enqueue;
- на каждый enqueue закрываем модалку и сразу обновляем локальный queue snapshot.
- добавляем:
  - component tests для трёх модалок;
  - browser-fidelity tests для keyboard/focus/dropdown поведения.
  - desktop E2E на stateful fixture server для create/enqueue happy path.

### Definition of done

- все 3 модалки создают реальные задания;
- ни одна из модалок не делает прямой upload из renderer;
- batch YouTube создаёт несколько отдельных job в одной очереди.
- modal suites проходят локально и стабильно.

## 12. Фаза 9. Мерж очереди с уроками в UI

### Цель

Сделать так, чтобы пользователь видел результат сразу, даже пока API-урок ещё не создан.

### Делаем

- реализуем `queue.getSnapshot(projectId)` и `queue.onChanged`;
- на странице проекта мержим:
  - реальные уроки из API;
  - локальные placeholder lessons из queue snapshot;
- placeholder lesson получает:
  - локальный ID;
  - `audioStatus` по состоянию job;
  - пустой `sourceUrl`, если его нет;
  - пустой список pipeline runs до появления ответа сервера;
- после успешного upload:
  - заменяем placeholder реальным уроком;
  - запускаем фоновый refresh проекта.
- добавляем component и desktop E2E тесты на merge реальных и локальных уроков.

### Definition of done

- новый урок виден сразу после enqueue;
- после успешного создания placeholder исчезает и заменяется реальным уроком;
- после failure пользователь видит ошибочное состояние строки.
- merge-поведение подтверждено автоматическими локальными тестами.

## 13. Фаза 10. Recovery, edge cases и polish

### Цель

Закрыть все неудобные реальные сценарии.

### Делаем

- обрабатываем:
  - обрыв сети во время upload;
  - недоступность сервера;
  - `401`;
  - `404` проекта;
  - `422` валидацию;
  - превышение 500 MB;
  - падение приложения в `download/transcode/upload`;
- приводим ошибки к понятным UI-сообщениям;
- для failed job оставляем workspace до явного cleanup;
- для completed job удаляем временные файлы;
- добавляем простую ручку cleanup stale data при запуске.
- добавляем fault-injection tests:
  - сбой процесса на `download`;
  - сбой на `transcode`;
  - сбой на `upload`;
  - рестарт приложения между стадиями.
  - stateful fixture server сценарии с изменяемым ответом после `POST`.

### Definition of done

- очередь не теряется после аварийного закрытия;
- пользователь получает понятную ошибку, а не “тихий” сбой;
- временные директории не разрастаются бесконтрольно.
- recovery suite локально воспроизводит и подтверждает все ключевые failure modes.

## 14. Фаза 11. Packaging, signing и installer UX

### Цель

Собрать инсталляторы, которые работают на чистых машинах без ручной установки утилит.

### Делаем

- настраиваем `electron-builder`:
  - `mac` targets: `dmg`, `zip`
  - `win` target: `nsis`
  - `extraResources` -> `build/bin`;
- настраиваем release icons, app metadata, product name:
  - macOS icon -> `build/icons/mac/icon.icns`
  - Windows icon -> `build/icons/win/icon.ico`
  - dev/base app icon -> `build/icons/icon.png`
- включаем signing:
  - macOS Developer ID + notarization;
  - Windows code signing certificate;
- добавляем third-party licenses в дистрибутив;
- документируем CI matrix:
  - `macos-latest` x64/arm64 отдельными job;
  - `windows-latest` x64 отдельной job;
- build всегда идёт после чистого `pnpm install --frozen-lockfile`.
- добавляем локальный packaged smoke:
  - build приложения;
  - запуск packaged binary;
  - проверка icons/resources/bin;
  - минимальный Playwright/Electron smoke на packaged app.

### Definition of done

- packaged app на чистой машине находит и запускает bundled binaries;
- packaged app и инсталляторы используют иконки из `build/icons`, а не дефолтные Electron assets;
- пользователю не требуется ставить `ffmpeg`, `yt-dlp` или `deno`;
- установка не вызывает лишних platform security warnings сверх неизбежных для неподписанной dev-сборки.
- packaged smoke локально воспроизводим и документирован.

## 15. Фаза 12. Финальная проверка

### Автотесты

Обязательный локальный набор:

- type gates:
  - `tsc --noEmit`
  - `vue-tsc --noEmit`
- unit/integration:
  - `vitest` + `@vitest/coverage-v8`
- component:
  - `@vue/test-utils` + `vitest`
- browser-fidelity:
  - `vitest` Browser Mode + Playwright provider
- desktop E2E:
  - `@playwright/test` + Electron launch
- contract:
  - `Prism` mock/proxy against `docs/client-api.yaml`
- in-process mocking:
  - `msw`
- stateful desktop backend for write/recovery E2E:
  - маленький fixture server с изменяемым состоянием
- debug tooling:
  - Playwright traces
  - Playwright screenshots
  - local HTML/coverage reports

Минимально обязательно покрыть:

- unit tests для:
  - parser списка YouTube-уроков;
  - mapper’ов API -> UI;
  - queue state transitions;
  - recovery logic;
- integration tests для:
  - queue repository;
  - media conversion на маленьких fixtures;
  - upload retries;
  - binary resolver;
- component tests для:
  - трёх модалок;
  - project lessons merge logic.
- browser-fidelity tests для:
  - dropdown;
  - modal keyboard/focus;
  - mobile actions panel;
- desktop E2E для:
  - settings flow;
  - projects -> project navigation;
  - enqueue и placeholder lessons;
  - restart recovery.

### Ручной smoke checklist

Проверяем на каждом target:

1. Первый запуск без настроек.
2. Сохранение URL/token.
3. Загрузка `/projects`.
4. Открытие проекта.
5. Добавление YouTube-урока.
6. Добавление batch YouTube.
7. Добавление локального MP3.
8. Добавление локального MP4.
9. Падение/закрытие приложения во время очереди и последующее восстановление.
10. Установка на чистую машину без глобальных `ffmpeg`/`yt-dlp`.
11. Проверка, что app icon и installer icon корректно отображаются на macOS и Windows.
12. Локальный запуск `test:all` без CI.
13. Просмотр trace/report для упавшего E2E сценария.

### Definition of done

- smoke checklist пройден на:
  - macOS arm64
  - macOS x64
  - Windows x64
- локальный `test:all` воспроизводимо запускается на машине разработчика;
- UI соответствует `docs/client-ui.md`;
- вся функциональность укладывается в 2 view;
- очередь восстанавливается после перезапуска;
- packaged app полностью self-contained.

## 16. Порядок выполнения по зависимостям

Фазы нужно проходить именно так:

1. Фаза 1
2. Фаза 2
3. Фаза 3
4. Фаза 4
5. Фаза 5
6. Фаза 6
7. Фаза 7
8. Фаза 8
9. Фаза 9
10. Фаза 10
11. Фаза 11
12. Фаза 12

Запрещено:

- подключать реальный API раньше завершения mock UI;
- делать очередь раньше, чем готов packaging path для бинарников;
- делать packaging раньше, чем queue recovery отлажен;
- принимать архитектурные решения “по месту” в ходе фаз 6–11.

## 17. Короткий итог

План намеренно идёт от внешнего к внутреннему:

- сначала точный UI;
- потом typed API и настройки;
- потом бинарники;
- потом очередь;
- потом упаковка и релиз.

Такой порядок минимизирует риск переделок и даёт проверить каждую критичную часть отдельно.
