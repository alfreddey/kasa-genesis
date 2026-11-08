import type { MetadataRoute } from "next";
import { getStories, siteUrl } from "@/lib/seo";

// Built from the live API on request, so the build does not need the API running.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const stories = await getStories();
  return [
    { url: base },
    ...stories.map((s) => ({ url: `${base}/stories/${encodeURIComponent(s.id)}` })),
  ];
}
