/**
 * Server-side helpers for SEO (#52): the public site URL and a failure-tolerant API reader.
 * Pages render without metadata rather than failing when the API is down.
 */
import type { Story, StorySummary } from "./api";

/** Public origin of the web app, used for canonical URLs, sitemap and robots. */
export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** Where the Next.js server reaches the API: the internal URL, else an absolute public one. */
function serverApiBase(): string | null {
  const internal = process.env.API_INTERNAL_URL?.replace(/\/+$/, "");
  if (internal) return internal;
  const pub = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (pub && /^https?:\/\//.test(pub)) return pub;
  return null;
}

async function getJson<T>(path: string): Promise<T | null> {
  const base = serverApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/v1${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 300 },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export const getStory = (id: string) => getJson<Story>(`/stories/${encodeURIComponent(id)}`);
export const getStories = async () => (await getJson<StorySummary[]>("/stories")) ?? [];

/** First sentence-ish excerpt for descriptions, capped for search and share previews. */
export function describe(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** schema.org structured data for a story page. */
export function storyJsonLd(story: Story) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: story.title,
    inLanguage: story.language,
    text: describe(story.text, 500),
    url: `${siteUrl()}/stories/${encodeURIComponent(story.id)}`,
  };
}
