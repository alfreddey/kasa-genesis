/** Small helpers for the Home page: cover palettes and scenes, story of the day, short language names. */
import type { StorySummary } from "./api";

export const COVER_PALETTES = ["orange", "teal", "pink", "yellow"] as const;
export type CoverPalette = (typeof COVER_PALETTES)[number];

/** The pictures a generated cover can show. They are places, not characters, so a cover never
 * promises an animal or a person that is not in the story. */
export const COVER_SCENES = ["hills", "baobab", "night", "river", "village", "palms"] as const;
export type CoverScene = (typeof COVER_SCENES)[number];

function hash(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** The same story always gets the same cover colors (there is no cover art yet). */
export function coverPalette(id: string): CoverPalette {
  return COVER_PALETTES[hash(id) % COVER_PALETTES.length]!;
}

/** The same story always gets the same scene. It is picked apart from the palette, so two
 * stories only look alike when both happen to match (6 scenes x 4 palettes = 24 covers). */
export function coverScene(id: string): CoverScene {
  return COVER_SCENES[Math.floor(hash(id) / COVER_PALETTES.length) % COVER_SCENES.length]!;
}

/** One story per local calendar day, rotating through the list. */
export function storyOfTheDay(
  stories: StorySummary[],
  now: Date = new Date(),
): StorySummary | null {
  if (stories.length === 0) return null;
  const day = Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 864e5,
  );
  return stories[day % stories.length] ?? null;
}

/** "Twi (Akan)" -> "Twi". The tiles and tags are small, so they show only the first part. */
export function shortLanguageName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "");
}
