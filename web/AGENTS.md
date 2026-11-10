# web/AGENTS.md

Guide for coding agents working in `web/`, the Next.js frontend. `CLAUDE.md` here imports this file. The root `AGENTS.md` covers the whole repo; this one covers only `web/`.

**Keeping this file current:** a PR that changes layout, commands, env vars or conventions updates the matching `AGENTS.md` in the same PR. CI runs `scripts/check_docs.py`, which fails on a mentioned path, `make` target or setting that no longer exists.

## What this is

A Next.js 15 app (App Router, React 19, TypeScript strict) that talks to the FastAPI service in `api/` over its `/api/v1` HTTP contract (issue #4). It has Home, Library, Saved, Parents and a story player, all inside one shared shell (backdrop + glass tab bar) so every page links to the others. Styling follows the Figma design system "Kasa Genesis Design System" (#80, #41-#47): tokens live in `globals.css`.

## Code map

```
src/app/                    Routes (App Router). Pages stay thin and render a component.
  layout.tsx                <html>, Nunito font, global CSS, offline banner.
  page.tsx                  "/" -> <Home />.
  library/page.tsx          "/library" -> <Library />.
  saved/page.tsx            "/saved" -> <Saved /> (hearted stories).
  parents/page.tsx          "/parents" -> <Parents /> (coming-soon placeholder until accounts, #parents).
  stories/[id]/page.tsx     "/stories/:id" -> <StoryPlayer id=... />.
  not-found.tsx             404 page.
  robots.ts, sitemap.ts     robots.txt and sitemap.xml (sitemap built from the live API).
  error.tsx, global-error.tsx  Error boundaries (page crash / root layout crash), "Try again".
  globals.css               Design tokens (from Figma, light + dark), liquid glass styles, Home and plain-page styles.
src/components/             UI. One component per file, kebab-case names, test next to it.
  home.tsx                  Home: greeting, language tiles, story of the day, shelf. Fetches languages + stories.
  cover-art.tsx             Placeholder cover (sun and hills) colored from the story id.
  app-shell.tsx             Shared page frame: savanna backdrop, content column, <TabBar>. Every app page renders inside it.
  tab-bar.tsx               Glass navigation (bottom bar, side rail from tablet width): Home, Library, Saved, Parents; only the current tab's icon is highlighted.
  library.tsx               Library: search, language filter, big cover grid.
  saved.tsx                 Saved stories (from favorites in localStorage).
  parents.tsx               Parents placeholder.
  story-card.tsx            Cover card linking to a story; storyHref(). story-grid.tsx lays cards out (2/3/5 columns).
  language-filter.tsx       Glass segmented language control.
  icons.tsx                 Inline SVG icons (currentColor).
  plain-page.tsx            Site header + narrow column for the error and 404 pages.
  story-player.tsx          Player page: cover, <audio>, heart (save), "Show the words" switch (listening is the default), next story link.
  offline-banner.tsx        Shown in the layout when the browser goes offline.
  error-view.tsx            Friendly crash fallback used by error.tsx.
  status.tsx                <Loading> and <ErrorState> (with retry). Use these for every async state.
src/lib/
  api.ts                    Typed API client: apiFetch, fetchStories/fetchStory/fetchLanguages, storyAudioUrl, ApiError.
  api-types.gen.ts          GENERATED from api/openapi.json by `npm run generate:api`. Never edit by hand.
  favorites.ts              useFavorites(): saved story ids in localStorage.
  use-languages.ts          useLanguages(): languages plus name(code).
  home.ts                   Home helpers: coverPalette(id), storyOfTheDay(), shortLanguageName().
  seo.ts                    Server-side SEO helpers: siteUrl() (SITE_URL), failure-tolerant getStory/getStories, JSON-LD.
  use-api.ts                useApi(load, deps): loading/error/success state, abort on unmount, retry().
src/test/fetch.ts           mockApi(routes): stubs global fetch with canned /api/v1 responses.
vitest.config.mts           jsdom, globals, "@/..." path alias, setup file.
eslint.config.mjs           next/core-web-vitals + next/typescript + prettier.
.env.example                NEXT_PUBLIC_API_URL.
```

Not here yet: i18n strings, hooks folder, service worker/offline (#16), read-along reader (#15).

## Commands

Run from `web/`.

| Task                           | Command                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| Install                        | `npm ci` (or `npm install` when changing deps)                          |
| Dev server against a local API | `npm run dev` with the API running via `make dev` from the repo root    |
| Lint + format check            | `npm run lint` (fix formatting with `npm run format`)                   |
| Regenerate API types           | `npm run generate:api` after `make openapi` (`npm run check:api` in CI) |
| Typecheck                      | `npm run typecheck`                                                     |
| Test                           | `npm test`                                                              |
| Build                          | `npm run build`                                                         |

Before pushing, run `npm run lint && npm run typecheck && npm test && npm run build`.

## Conventions

- **Server vs client components.** Pages in `src/app` are server components that only read route params and render a component. Components that fetch or hold state start with `"use client"`. Data is fetched in the browser today, because `NEXT_PUBLIC_API_URL` is the browser-facing URL; move fetching to the server only together with a server-side API URL.
- **Calling the API.** Only through `src/lib/api.ts`. Add one small function per endpoint that calls `apiFetch`, and use it from a component through `useApi`. Never call `fetch` directly from a component. `apiFetch` adds the base URL, a 10 s timeout and turns failures into `ApiError` (`status` 0 means the API was unreachable or too slow).
- **Async states.** Every fetch shows `<Loading>` while waiting and `<ErrorState onRetry=...>` on failure. A 404 shows a friendly message without retry.
- **Audio.** Use the URL from `storyAudioUrl(id)` as the `<audio>` `src`; the browser streams it. The first request for a story can be slow because the API synthesizes it, so show a status while the element is waiting.
- **Styling.** Plain CSS in `globals.css`. Colors, spacing, radius, motion and type come from CSS variables named after the Figma variables (`--color-text-primary`, `--radius-md`, ...); use them instead of hex values, and change a token in Figma and here by the same name. `:root` is Color Light, the `prefers-color-scheme: dark` block is Color Dark. Glass surfaces use the `.glass` class (blur, with a solid fallback for no `backdrop-filter` and `prefers-reduced-transparency`). Font is Nunito via `@fontsource-variable/nunito`. Home is responsive with two media queries matching the Figma designs: from 768px (tablet) the bottom tab bar becomes a side rail and the featured card goes wide, from 1200px (desktop) the sizes grow again. Respect `prefers-reduced-motion`.
- **Accessibility.** Status text uses `role="status"`, errors `role="alert"`, controls have labels, and story content carries `lang` set to its language code. Tests query by role and label, which keeps this honest.
- **Tests.** Vitest + React Testing Library, file next to the code as `*.test.ts(x)`. Mock the network with `mockApi` from `src/test/fetch.ts`, never a real API. Query by role, label or text; use `userEvent` for interaction.
- **Formatting.** Prettier (print width 100) decides; ESLint does not argue with it.

## Where to change things

| You want to...                                           | Edit                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Add a page                                               | New folder in `src/app/` with `page.tsx` that renders a component from `src/components/`                      |
| Call a new endpoint                                      | Add a function in `src/lib/api.ts` (types come from `api-types.gen.ts`), plus a test in `src/lib/api.test.ts` |
| Change the library                                       | `src/components/library.tsx` and its test                                                                     |
| Change the player (and later the read-along reader, #15) | `src/components/story-player.tsx` and its test                                                                |
| Change loading or error messages                         | `src/components/status.tsx`                                                                                   |
| Change colours or layout                                 | `src/app/globals.css`                                                                                         |
| Change the Home page                                     | `src/components/home.tsx` and its test                                                                        |
| Change which API the app talks to                        | `NEXT_PUBLIC_API_URL` in `.env.local`, then restart or rebuild                                                |

## Gotchas

- Only env vars that start with `NEXT_PUBLIC_` reach the browser, and they are inlined at build time. Changing `NEXT_PUBLIC_API_URL` needs a rebuild (and, for Docker, a build arg).
- The API must list the web app's origin in `ALLOWED_ORIGINS` (default `http://localhost:3000`), or the browser blocks every request with a CORS error that looks like "Could not reach the server".
- iOS Safari only starts audio from a user gesture, so never autoplay narration; let the child press play.
- In Next 15, route `params` is a Promise; `await` it in the server page.
- When offline support (#16) adds a service worker, it can serve stale pages in `npm run dev`. Unregister it in the browser devtools if changes do not show up.
