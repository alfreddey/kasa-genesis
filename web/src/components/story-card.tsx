import Link from "next/link";
import type { StorySummary } from "@/lib/api";
import { htmlLang } from "@/lib/home";
import { CoverArt } from "./cover-art";
import { PlayIcon } from "./icons";

export const storyHref = (s: Pick<StorySummary, "id">) => `/stories/${encodeURIComponent(s.id)}`;

/** A cover with title and language that opens the story player. */
export function StoryCard({ story, language }: { story: StorySummary; language: string }) {
  return (
    <Link href={storyHref(story)} className="story-card">
      <CoverArt id={story.id}>
        <span className="cover-tag glass glass-on-art">{language}</span>
        <span className="play-glass glass glass-on-art">
          <PlayIcon />
        </span>
      </CoverArt>
      <span className="story-card-title" lang={htmlLang(story.language)}>
        {story.title}
      </span>
      <span className="story-card-language">{language}</span>
    </Link>
  );
}
