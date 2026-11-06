# Kasa Genesis web app

The Next.js (App Router, TypeScript) frontend. It lists stories from the API, opens one, and plays its narration.

## Run it against a local API

You need Node 20 or newer (CI and the Docker image use Node 22).

1. Start the API from the repo root. `make dev` serves it at http://localhost:8000 with the instant placeholder voice, so you do not need the TTS model:

   ```sh
   make setup   # once
   make dev
   ```

2. In another terminal, start the web app:

   ```sh
   cd web
   cp .env.example .env.local   # optional: the default already points at http://localhost:8000
   npm install
   npm run dev
   ```

3. Open http://localhost:3000.

The API must allow the web app's origin. It allows `http://localhost:3000` by default; set `ALLOWED_ORIGINS` on the API if you serve the web app somewhere else.

## Settings

| Variable              | Default                 | What it does                                                                                                          |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the API, without `/api/v1`. Read in the browser and baked in at build time, so rebuild after changing it. |

## Scripts

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Dev server with hot reload on port 3000               |
| `npm run lint`       | ESLint, then a Prettier format check                  |
| `npm run format`     | Rewrite files with Prettier                           |
| `npm run typecheck`  | `tsc --noEmit` (strict mode)                          |
| `npm test`           | Vitest + React Testing Library, once                  |
| `npm run test:watch` | Vitest in watch mode                                  |
| `npm run build`      | Production build (`output: "standalone"`, for Docker) |

See [AGENTS.md](AGENTS.md) for the code map and conventions.
