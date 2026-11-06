"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, fetchStory, storyAudioUrl } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { ErrorState, Loading } from "./status";

type AudioStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export function StoryPlayer({ id }: { id: string }) {
  const story = useApi((signal) => fetchStory(id, signal), [id]);
  const [audio, setAudio] = useState<AudioStatus>("idle");

  if (story.status === "loading") return <Loading label="Loading story…" />;
  if (story.status === "error") {
    const notFound = story.error instanceof ApiError && story.error.status === 404;
    return (
      <>
        <ErrorState
          error={notFound ? new Error("We could not find that story.") : story.error}
          onRetry={notFound ? undefined : story.retry}
        />
        <BackLink />
      </>
    );
  }

  const { title, text } = story.data;
  return (
    <article lang={story.data.language}>
      <BackLink />
      <h2>{title}</h2>
      {/* Audio is synthesized on first request, so the first play can take a while. */}
      <audio
        controls
        preload="none"
        src={storyAudioUrl(id)}
        aria-label={`Listen to ${title}`}
        onPlay={() => setAudio("loading")}
        onWaiting={() => setAudio("loading")}
        onPlaying={() => setAudio("playing")}
        onPause={() => setAudio("paused")}
        onEnded={() => setAudio("ended")}
        onError={() => setAudio("error")}
      />
      {audio === "loading" && <Loading label="Preparing the audio…" />}
      {audio === "error" && (
        <ErrorState error={new Error("The audio could not be played. Try again in a moment.")} />
      )}
      <p className="story-text">{text}</p>
    </article>
  );
}

function BackLink() {
  return (
    <p>
      <Link href="/">← All stories</Link>
    </p>
  );
}
