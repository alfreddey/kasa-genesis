/** Small helpers for the Home page: cover palettes, story of the day, short language names. */
import type { StorySummary } from "./api";

export const COVER_PALETTES = ["orange", "teal", "pink", "yellow"] as const;
export type CoverPalette = (typeof COVER_PALETTES)[number];

/** The same story always gets the same cover colors (there is no cover art yet). */
export function coverPalette(id: string): CoverPalette {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COVER_PALETTES[hash % COVER_PALETTES.length]!;
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

const HTML_LANG: Record<string, string> = { aka: "ak", ewe: "ee" };

/** The BCP 47 tag for an API language code (ISO 639-3), for the HTML `lang` attribute. */
export function htmlLang(code: string): string {
  return HTML_LANG[code] ?? code;
}
