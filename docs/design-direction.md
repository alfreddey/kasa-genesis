# Design direction: Sunny storybook

The look and feel of the web app, and the reasons behind it. Read this before you change styling in `web/` or build screens in Figma.

**Status:** current direction since 10 November 2026. It was chosen by the nightly redesign run, which Scar gave full creative control over the look. Scar can overrule it; until then, follow it. It replaces "liquid glass on every surface".

## The idea

The app is a picture book that talks. A child of four to ten opens it, sees a sunny place and a friendly spider, presses one big button and hears a story. Nothing on the screen needs reading to be used, and nothing looks pressable unless it is.

## Three rules

1. **Paper holds.** Everything you read or press sits on a solid, warm paper surface (`.paper`, `--color-bg-paper`). Text never sits on glass or on a busy picture. The only text that sits straight on the scene is the big page heading and its one-line subtitle, in the sky where the scene is calm.
2. **Edges press.** Anything tappable has a solid bottom edge (`--edge-size`, 5px) and sinks onto it when pressed. The chosen language is the button that stays pressed in. If it has no edge, it is not a button.
3. **Glass floats.** Translucent glass is kept for the one thing that floats above the page: the navigation (bottom bar on phones, side rail from tablet width). It uses a strong fill so its labels keep their contrast.

## Why glass moved off the content

The first version put story cards, the player and the language picker on glass over the scene. Three problems showed up in the screenshots and in use:

- **Contrast you cannot predict.** Glass takes its colour from what is behind it. Titles and controls ended up over dark hills on one page and over a pale sky on the next, so the same text passed contrast in one place and failed in another.
- **Cost on the phones our readers have.** `backdrop-filter` on every card is heavy on budget Android phones, which is what most families in Ghana will use. One glass bar is cheap; a page of glass cards is not.
- **Children need shapes that say "press me".** A see-through card does not look like a thing. A paper tile with a thick edge does, and a child who cannot read yet can still tell what will happen.

What stays from liquid glass: the floating navigation, its blur and highlight, and the fallbacks for `prefers-reduced-transparency` and browsers without `backdrop-filter`.

## What did not change

- The palette (palette C, "Sunny orange": orange, teal, yellow, pink) and every existing Figma token name.
- The typeface (Nunito) and the type scale.
- The world: a savanna with a sun, hills and an acacia tree. At night (dark mode) it becomes a moonlit scene with stars and fireflies.
- The orange button with its darker press edge (`--press-edge`).

## The pieces

| Piece             | What it is                                                                                                                                                                                                                                                                                                                                                             | Where                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Scene             | Sky, sun, three drifting clouds, hills and an acacia behind every page. Decorative.                                                                                                                                                                                                                                                                                    | `web/src/components/scene.tsx`, `.scene*`                                                        |
| Ananse            | The mascot: a small smiling spider, the storyteller of Akan and Ewe folktales. It hangs from a thread beside the greeting, rides on the player cover and bobs while a story plays, swings while something loads, and looks worried (`mood="oops"`) on errors and the 404 page. Always decorative (`aria-hidden`), always next to real text, never on top of a control. | `web/src/components/mascot.tsx`, `.mascot*`                                                      |
| Covers            | Until stories carry real art, each story gets one of six places (hills, baobab at sunset, moonlit night, river, village, palms by the sea) in one of four palettes, picked from its id, so the same story always looks the same. Places, not characters, so a cover never promises something that is not in the story.                                                 | `web/src/components/cover-art.tsx`, `coverScene()` and `coverPalette()` in `web/src/lib/home.ts` |
| Paper tiles       | Story cards, the story of the day, the player panel, empty states, search.                                                                                                                                                                                                                                                                                             | `.paper`, `.story-card`, `.featured`, `.player-panel`, `.empty`                                  |
| Player            | No browser audio controls. One big play and pause button (108px, 120px from tablet width), 10-second skip buttons, a thick progress bar a child can drag, the time, a heart, and a large "Show the words" switch. Listening is the default; the words are an extra.                                                                                                    | `web/src/components/story-player.tsx`                                                            |
| Keep listening    | The story a child stopped halfway: a paper card on Home with the cover, how far they got and a play button. The player opens at that place, the big button says "Keep listening", and a small "Start again" button goes back to the top. Covers of started stories carry a thin bar along the bottom.                                                                  | `web/src/lib/listening.ts`, `.keep-listening`, `.cover-progress`, `.start-again`                 |
| The end and stars | When a story plays to its end, the player says "The end!", Ananse cheers under three stars and the next story sits right below. A story heard to the end earns one star: a sticker on its cover and one more in the count under the greeting. The sticker and the count are labels, not buttons, so they have no edge.                                                 | `web/src/components/story-player.tsx`, `.the-end`, `.star-badge`, `.star-count`                  |
| Ribbon            | A short kente-inspired strip of the four brand colours under the greeting.                                                                                                                                                                                                                                                                                             | `.ribbon`                                                                                        |

## What the app remembers

Children stop stories halfway all the time, so the app remembers where (see "Keep listening" above) and which stories were heard to the end. The rules:

- **A star is for hearing a story to the end, and for nothing else.** No streaks, no daily goals, no countdowns, no reminders. The app is glad when a child comes back and never nags them to.
- A stop in the first or last 5 seconds is not "in the middle", so very short clips never show up as unfinished. Dragging the bar to the end is not hearing the story: no ending, no star.
- It all stays on the device (`localStorage`, key `kasa:listening`) until parent accounts with child profiles exist. The Parents page says so in plain words and can forget everything, behind a second question.

## Sizes

- Touch targets are at least 48px. Things a child presses are bigger: language buttons 54px tall, heart 58px, skip 68px, play 108px.
- Corners are generous: 18px on buttons, 26px on tiles, full circles for the transport buttons.
- Three layouts: phone (one column, bottom bar), tablet from 768px (side rail, wide story of the day, three-column grid), desktop from 1100px (four columns, the player splits into cover and controls; five columns from 1360px). Phones down to 320px wide are supported.

## Motion

Gentle and slow, and it always means something: the play button ripples and Ananse bobs while a story is playing, the mascot swings while something loads, clouds drift, pressed things sink. With `prefers-reduced-motion` every animation and transition is switched off.

## Accessibility

- Text on paper keeps WCAG AA contrast in light and dark, because paper is a known colour.
- White on the orange button is about 3.5 to 1, which passes AA only for large bold text. Labels on orange are 20px bold (`--text-label-lg`); do not put smaller text on orange.
- The scene, the mascot and the covers are hidden from assistive technology. Every control has a text label, and the progress bar speaks its position ("12 seconds of 3 minutes").
- Story titles and story text carry `lang` with the story's language code. The app's own words are English for now.
- Every control shows a focus ring in `--color-focus-ring` when reached with the keyboard.

## Tokens added in code

These were added in `web/src/app/globals.css` for this look and are marked "storybook" there. They still need to be added to the Figma file under the same names.

| Token                                                                | Light                                      | Dark                                          | Used for                                                            |
| -------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------- |
| `--color-bg-paper`                                                   | `#fffdf9`                                  | `#1d2330`                                     | Paper surfaces                                                      |
| `--color-bg-paper-sunken`                                            | `#fff3e0`                                  | gray 800                                      | Wells inside paper (the switch row, next-story arrow)               |
| `--color-paper-border`                                               | brown at 10%                               | white at 10%                                  | Hairline around paper                                               |
| `--color-shadow-soft`                                                | brown at 14%                               | black at 40%                                  | Soft shadow under paper                                             |
| `--color-text-on-scene`                                              | gray 800                                   | gray 200                                      | Subtitles sitting on the sky                                        |
| `--color-text-kicker`                                                | orange 700                                 | orange 300                                    | Small labels such as "Story of the day"                             |
| `--color-chip-bg`, `--color-chip-text`                               | teal 100, teal 700                         | teal 900, teal 200                            | Language chips                                                      |
| `--color-track`                                                      | `#f0e2cf`                                  | gray 700                                      | Progress bar track                                                  |
| `--edge-paper`, `--edge-secondary`, `--edge-accent`, `--edge-on-art` | `#e6d5bd`, teal 300, `#d9a900`, ink at 20% | `#080b11`, `#011a18`, `#a88200`, black at 45% | The solid bottom edge of paper, teal, yellow and on-picture buttons |
| `--edge-size`                                                        | 5px                                        | 5px                                           | Height of that edge                                                 |
| `--scene-*`                                                          | sky, hills, tree, cloud                    | night versions                                | The scene                                                           |
| `--mascot-*`                                                         | body, feet, thread                         | night versions                                | Ananse                                                              |
| `--night-500` to `--night-900`                                       | primitives                                 | primitives                                    | The night sky                                                       |

## For the Figma file

The Figma file "Kasa Genesis Design System" was built for liquid glass. To match the app:

1. Add the tokens above as variables, with light and dark values.
2. Add components: paper tile, story card (plain, started, heard), story of the day, "Keep listening" card, language button (rest and pressed), play, skip, heart, progress bar, switch, chip, kicker, ribbon, star sticker, star count, the happy ending, empty state.
3. Add Ananse (happy, oops, hanging) and the six cover scenes in the four palettes.
4. Redraw the screens (Home, Library, Saved, Parents, player, 404) from the live app at phone, tablet and desktop widths, light and dark.
5. Keep the glass style only on the navigation component.

## What is next

Open work is tracked in GitHub issues labelled `design-handoff`. The big ones: real cover art per story, highlighting the word being read (#15), lock-screen controls, the parents area, and moving what the app remembers onto the child's profile once accounts exist.
