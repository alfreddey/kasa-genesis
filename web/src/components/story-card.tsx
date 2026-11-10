import Link from "next/link";
import type { StorySummary } from "@/lib/api";
import { htmlLang } from "@/lib/home";
import { CoverArt } from "./cover-art";
import { PlayIcon } from "./icons";

export const storyHref = (s: Pick<StorySummary, "id">) => `/stories/${encodeURIComponent(s.id)}`;

/** A story as a thick paper tile: cover on top, title and language below. Opens the player. */
export function StoryCard({ story, language }: { story: StorySummary; language: string }) {
  return (
    <Link href={storyHref(story)} className="story-card">
      <span className="story-card-art">
        <CoverArt id={story.id} />
        <span className="play-badge" aria-hidden="true">
          <PlayIcon />
        </span>
      </span>
      <span className="story-card-body">
        <span className="story-card-title" lang={htmlLang(story.language)}>
          {story.title}
        </span>
        <span className="chip">{language}</span>
      </span>
    </Link>
  );
}
