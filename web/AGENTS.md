# web/AGENTS.md

Guide for coding agents working in `web/`, the Next.js frontend. `CLAUDE.md` here imports this file. The root `AGENTS.md` covers the whole repo; this one covers only `web/`.

**Keeping this file current:** a PR that changes layout, commands, env vars or conventions updates the matching `AGENTS.md` in the same PR. CI runs `scripts/check_docs.py`, which fails on a mentioned path, `make` target or setting that no longer exists.

## What this is

A Next.js 15 app (App Router, React 19, TypeScript strict) that talks to the FastAPI service in `api/` over its `/api/v1` HTTP contract (issue #4). It has Home, Library, Saved, Parents and a story player, all inside one shared shell (scene + glass tab bar) so every page links to the others. The look is "Sunny storybook", described in `docs/design-direction.md`: content on solid paper, buttons with an edge that press in, glass only on the navigation, and Ananse the spider as the mascot. Tokens live in `globals.css` and are named after the Figma design system "Kasa Genesis Design System" (#80, #41-#47).

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
  globals.css               Design tokens (Figma names, light + dark) and every style: paper, buttons, scene, mascot, covers, pages.
src/components/             UI. One component per file, kebab-case names, test next to it.
  home.tsx                  Home: greeting and star count, language tiles, "Keep listening" card, story of the day, shelf. Fetches languages + stories.
  cover-art.tsx             Generated cover: one of six place scenes in one of four palettes, both picked from the story id.
  app-shell.tsx             Shared page frame: <Scene>, content column, <TabBar>. Every app page renders inside it.
  scene.tsx                 The backdrop: sky, sun, clouds, hills, acacia (moon, stars and fireflies in dark mode). Decorative.
  mascot.tsx                Ananse the spider: <Mascot mood="happy|oops" hanging />. Decorative, always next to real text.
  tab-bar.tsx               Glass navigation (bottom bar, side rail from tablet width): Home, Library, Saved, Parents; only the current tab's icon is highlighted.
  library.tsx               Library: search, language filter, big cover grid.
  saved.tsx                 Saved stories (from favorites in localStorage).
  parents.tsx               Parents placeholder, plus what is remembered on this device and a button to forget it.
  story-card.tsx            Paper tile linking to a story, with a star sticker (heard to the end) or a progress bar (started); storyHref(). story-grid.tsx lays cards out (2/3/4/5 columns).
  language-filter.tsx       Language picker: paper buttons, the chosen one stays pressed in (aria-pressed).
  icons.tsx                 Inline SVG icons (currentColor).
  plain-page.tsx            Scene + site header + narrow paper card for the error and 404 pages.
  story-player.tsx          Player page: cover, a hidden <audio> driven by our own controls (play/pause, 10 s skips, a progress bar to drag), heart (save), "Show the words" switch (listening is the default), next story link. Picks a story up where the child stopped and ends with "The end!" and a star.
  offline-banner.tsx        Shown in the layout when the browser goes offline.
  error-view.tsx            Friendly crash fallback used by error.tsx.
  status.tsx                <Loading> and <ErrorState> (with retry), both with the mascot. Use these for every async state.
src/lib/
  api.ts                    Typed API client: apiFetch, fetchStories/fetchStory/fetchLanguages, storyAudioUrl, ApiError.
  api-types.gen.ts          GENERATED from api/openapi.json by `npm run generate:api`. Never edit by hand.
  favorites.ts              useFavorites(): saved story ids in localStorage.
  listening.ts              useListening(): per story, where the child stopped and whether it was heard to the end (localStorage). saveProgress(), markFinished(), clearListening(), inProgress(), starCount().
  use-languages.ts          useLanguages(): languages plus name(code).
  home.ts                   Home and cover helpers: coverPalette(id), coverScene(id), storyOfTheDay(), shortLanguageName(), htmlLang(code).
  time.ts                   formatTime(seconds) -> "1:23", spokenTime(seconds) -> "1 minute 23 seconds" and timeLeft(seconds) -> "3 minutes left".
  seo.ts                    Server-side SEO helpers: siteUrl() (SITE_URL), failure-tolerant getStory/getStories, JSON-LD.
  use-api.ts                useApi(load, deps): loading/error/success state, abort on unmount, retry().
src/test/fetch.ts           mockApi(routes): stubs global fetch with canned /api/v1 responses.
e2e/                        Playwright browser tests (#51): fixtures.ts stubs /api/v1 in the browser and runs axe; flows.spec.ts has the flows, a11y.spec.ts runs axe (contrast included) on every screen in light and dark.
playwright.config.ts        Pixel 5 Chromium project; builds and starts the app on port 3100.
vitest.config.mts           jsdom, globals, "@/..." path alias, setup file.
eslint.config.mjs           next/core-web-vitals + next/typescript + prettier.
.env.example                NEXT_PUBLIC_API_URL.
```

Not here yet: i18n strings, hooks folder, service worker/offline (#16), read-along reader (#15).

## Commands

Run from `web/`.

| Task                           | Command                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Install                        | `npm ci` (or `npm install` when changing deps)                                     |
| Dev server against a local API | `npm run dev` with the API running via `make dev` from the repo root               |
| Lint + format check            | `npm run lint` (fix formatting with `npm run format`)                              |
| Regenerate API types           | `npm run generate:api` after `make openapi` (`npm run check:api` in CI)            |
| Typecheck                      | `npm run typecheck`                                                                |
| Test                           | `npm test`                                                                         |
| Browser tests                  | `npm run e2e` (needs `npx playwright install chromium` once; builds the app first) |
| Build                          | `npm run build`                                                                    |

Before pushing, run `npm run lint && npm run typecheck && npm test && npm run build`.

## Conventions

- **Server vs client components.** Pages in `src/app` are server components that only read route params and render a component. Components that fetch or hold state start with `"use client"`. Data is fetched in the browser today, because `NEXT_PUBLIC_API_URL` is the browser-facing URL; move fetching to the server only together with a server-side API URL.
- **Calling the API.** Only through `src/lib/api.ts`. Add one small function per endpoint that calls `apiFetch`, and use it from a component through `useApi`. Never call `fetch` directly from a component. `apiFetch` adds the base URL, a 10 s timeout and turns failures into `ApiError` (`status` 0 means the API was unreachable or too slow).
- **Async states.** Every fetch shows `<Loading>` while waiting and `<ErrorState onRetry=...>` on failure. A 404 shows a friendly message without retry.
- **Audio.** Use the URL from `storyAudioUrl(id)` as the `<audio>` `src`; the browser streams it. The first request for a story can be slow because the API synthesizes it, so show a status while the element is waiting. The player hides the browser's own controls and drives the element itself, so every button follows the element's events (`play`, `waiting`, `playing`, `pause`, `ended`, `error`, `timeupdate`), never a guess. Seeking needs the server to answer `Range` requests (the API does for story audio). The skip buttons and the progress bar stay disabled until `audio.seekable` says seeking is possible, because a failed seek jumps back to the start of the story.
- **What the app remembers.** Only through `src/lib/listening.ts`, never `localStorage` directly. The player writes the place down every 5 seconds while a story plays, on pause, and when the page is hidden or left; a stop in the first or last 5 seconds is not kept. A star is earned only by the audio's `ended` event (a drag to the end does not count). Resuming sets `currentTime` before the audio loads (it keeps `preload="none"`) and checks the place again in `readMedia()`. The story page renders the player with `key={id}`, so each story gets a fresh one. No streaks, goals or reminders: see "What the app remembers" in `docs/design-direction.md`.
- **Styling.** Plain CSS in `globals.css`, following the three rules in `docs/design-direction.md`. Paper holds: everything you read or press sits on a solid surface (`.paper`), never on glass or straight on a picture. Edges press: anything tappable has a solid bottom edge (`--edge-size`) and sinks when pressed (`.btn`, `.segment`, `.play-main`); if it has no edge it is not a button. Glass floats: `.glass` (blur, with a solid fallback for no `backdrop-filter` and `prefers-reduced-transparency`) is only for the navigation. Colors, spacing, radius, motion and type come from CSS variables named after the Figma variables (`--color-text-primary`, `--radius-md`, ...); use them instead of hex values, and change a token in Figma and here by the same name. Tokens marked "storybook" in `globals.css` exist only in code so far. `:root` is Color Light, the `prefers-color-scheme: dark` block is Color Dark (a moonlit scene). Font is Nunito via `@fontsource-variable/nunito`. Layouts are phone first: from 768px the bottom tab bar becomes a side rail and the featured card goes wide, from 1100px the player splits into cover and controls, and a small block below 360px keeps the player controls inside their panel. Touch targets are at least 48px. Respect `prefers-reduced-motion`: one block at the end of the file switches every animation off.
- **Accessibility.** Status text uses `role="status"`, errors `role="alert"`, controls have labels, and story titles and story text carry `lang` set through `htmlLang()` (the BCP 47 tag for the story's language code). The scene, the mascot and the covers are decorative (`aria-hidden`), so they never carry meaning on their own. White text on the orange button only passes contrast as large bold text; keep it at `--text-label-lg`. Tests query by role and label, which keeps this honest.
- **Tests.** Vitest + React Testing Library, file next to the code as `*.test.ts(x)`. Mock the network with `mockApi` from `src/test/fetch.ts`, never a real API. Query by role, label or text; use `userEvent` for interaction. jsdom cannot play media, so the player tests stub `play` and `pause` on `HTMLMediaElement.prototype` and fire the media events by hand.
- **Browser tests.** `e2e/` tests run against the built app with the API stubbed in the browser (`stubApi`), so they need no API or model. Add a flow to `flows.spec.ts`, call `expectAccessible(page)` on each new page, and query by role or label. `expectAccessible` checks colour contrast too; `e2e/a11y.spec.ts` runs it on every screen in light and dark. Debug with `npx playwright test --ui` or `--trace on`. Not covered yet: WebKit/iPhone, read-along, offline.
- **Formatting.** Prettier (print width 100) decides; ESLint does not argue with it.

## Where to change things

| You want to...                                           | Edit                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Add a page                                               | New folder in `src/app/` with `page.tsx` that renders a component from `src/components/`                      |
| Call a new endpoint                                      | Add a function in `src/lib/api.ts` (types come from `api-types.gen.ts`), plus a test in `src/lib/api.test.ts` |
| Change the library                                       | `src/components/library.tsx` and its test                                                                     |
| Change the player (and later the read-along reader, #15) | `src/components/story-player.tsx` and its test                                                                |
| Change loading or error messages                         | `src/components/status.tsx`                                                                                   |
| Change what is remembered about listening                | `src/lib/listening.ts` and its test; the player, Home, the story card and Parents read it                     |
| Change colours or layout                                 | `src/app/globals.css` (read `docs/design-direction.md` first)                                                 |
| Change the mascot or the backdrop                        | `src/components/mascot.tsx`, `src/components/scene.tsx` and their styles in `src/app/globals.css`             |
| Add or change a cover scene                              | `src/components/cover-art.tsx` and the scene list in `src/lib/home.ts`                                        |
| Change the Home page                                     | `src/components/home.tsx` and its test                                                                        |
| Change which API the app talks to                        | `NEXT_PUBLIC_API_URL` in `.env.local`, then restart or rebuild                                                |

## Gotchas

- Only env vars that start with `NEXT_PUBLIC_` reach the browser, and they are inlined at build time. Changing `NEXT_PUBLIC_API_URL` needs a rebuild (and, for Docker, a build arg).
- The API must list the web app's origin in `ALLOWED_ORIGINS` (default `http://localhost:3000`), or the browser blocks every request with a CORS error that looks like "Could not reach the server".
- iOS Safari only starts audio from a user gesture, so never autoplay narration; let the child press play.
- In Next 15, route `params` is a Promise; `await` it in the server page.
- When offline support (#16) adds a service worker, it can serve stale pages in `npm run dev`. Unregister it in the browser devtools if changes do not show up.
