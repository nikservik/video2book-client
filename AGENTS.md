# Video2Book Client

## Project Summary

Video2Book Client is a small internal Electron desktop application for adding lessons to remote Video2Book projects.

The app has two screens:

- project folders and projects list
- lessons list inside a project

Lessons can be added in three ways:

- local audio or video file
- single YouTube URL
- batch of YouTube URLs

The remote API accepts only audio upload, so the desktop client does the media work locally:

- YouTube -> `yt-dlp` -> audio
- local video -> `ffmpeg` -> audio
- audio upload -> remote API

For YouTube-based lesson creation the original URL must be sent to the API as optional multipart field `source_url`.

## Stack

- Electron
- electron-vite
- Vue 3
- Vue Router
- Tailwind CSS 4
- openapi-fetch
- openapi-typescript
- Vitest
- Playwright

## Architecture

- `renderer` is UI only
- `main` owns all HTTP calls, token handling, queue, filesystem, and external binaries
- `preload` exposes a typed IPC bridge
- renderer must not talk to the API directly
- renderer must not know the access token

Important folders:

- `electron/main`
- `electron/preload`
- `electron/shared`
- `src`
- `tests`
- `docs`

## Runtime Rules

- Always use `pnpm`, never `npm`.
- Production API base URL: `https://vb.nikiforovy.university/`
- Dev/test API base URL: `http://video2book.test/`
- Packaged app uses production base URL automatically.
- Dev app and packaged app use separate `userData` storage.
- External links must open in the system browser.
- Closing the main window must quit the whole app.

## Binaries

Bundled tools:

- `ffmpeg`
- `ffprobe`
- `yt-dlp`
- `deno`

Default host binaries live in:

- `build/bin`

Cross-target binaries live in:

- `build/bin-targets/darwin-x64`
- `build/bin-targets/win32-x64`

## Build Commands

Main local workflows:

- `pnpm dev`
- `pnpm run test:all`
- `pnpm run dist:mac:arm64`
- `pnpm run dist:mac:x64`
- `pnpm run dist:win:x64`

Installers are built without Developer ID / notarization / code signing certificates.

## API and UI Docs

- UI spec: `docs/client-ui.md`
- OpenAPI spec: `docs/client-api.yaml`
- Architecture notes: `docs/architecture.md`
- Implementation plan: `docs/plan.md`
