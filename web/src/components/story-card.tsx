"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { StorySummary } from "@/lib/api";
import { htmlLang } from "@/lib/home";
import { heardFraction, useListening } from "@/lib/listening";
import { CoverArt } from "./cover-art";
import { PlayIcon, StarIcon } from "./icons";

export const storyHref = (s: Pick<StorySummary, "id">) => `/stories/${encodeURIComponent(s.id)}`;

/**
 * A story as a thick paper tile: cover on top, title and language below. Opens the player.
 * The cover carries a star sticker once the story was heard to the end, and a bar along its
 * bottom while the child is in the middle of it.
 */
export function StoryCard({ story, language }: { story: StorySummary; language: string }) {
  const heard = useListening()[story.id];
  const part = heardFraction(heard);
  return (
    <Link href={storyHref(story)} className="story-card">
      <span className="story-card-art">
        <CoverArt id={story.id} />
        {heard?.finished && (
          <span className="star-badge">
            <StarIcon />
            <span className="visually-hidden">Heard to the end.</span>
          </span>
        )}
        <span className="play-badge" aria-hidden="true">
          <PlayIcon />
        </span>
        {part > 0 && (
          <span
            className="cover-progress"
            style={{ "--progress": `${Math.round(part * 100)}%` } as CSSProperties}
          >
            <span className="visually-hidden">Started.</span>
          </span>
        )}
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
