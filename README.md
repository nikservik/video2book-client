# Video2Book Client

Desktop client for the internal Video2Book team.

## What It Does

- shows folders with projects
- shows lessons inside a project
- adds lessons from local audio/video
- adds lessons from one or many YouTube links
- downloads or converts media locally, then uploads audio to the server

## Stack

- Electron
- Vue 3
- Tailwind CSS 4
- electron-vite
- electron-builder

## Development

```bash
pnpm install
pnpm dev
```

## Tests

```bash
pnpm run test:all
```

## Builds

```bash
pnpm run dist:mac:arm64
pnpm run dist:mac:x64
pnpm run dist:win:x64
```

## Docs

- `docs/client-ui.md`
- `docs/client-api.yaml`
- `docs/architecture.md`
- `docs/plan.md`
