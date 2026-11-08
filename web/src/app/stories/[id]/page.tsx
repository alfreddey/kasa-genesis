import type { Metadata } from "next";
import { StoryPlayer } from "@/components/story-player";
import { describe, getStory, siteUrl, storyJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const story = await getStory(id);
  if (!story) return {};
  const url = `${siteUrl()}/stories/${encodeURIComponent(story.id)}`;
  const description = describe(story.text);
  return {
    title: story.title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", title: story.title, description, url, locale: story.language },
    twitter: { card: "summary", title: story.title, description },
  };
}

export default async function StoryPage({ params }: Props) {
  const id = decodeURIComponent((await params).id);
  const story = await getStory(id);
  return (
    <>
      {story && (
        <script
          type="application/ld+json"
          // JSON.stringify output with "<" escaped cannot break out of the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(storyJsonLd(story)).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <StoryPlayer id={id} />
    </>
  );
}
