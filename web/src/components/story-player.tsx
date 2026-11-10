"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, fetchStories, fetchStory, storyAudioUrl } from "@/lib/api";
import { useFavorites } from "@/lib/favorites";
import { htmlLang } from "@/lib/home";
import { useApi } from "@/lib/use-api";
import { useLanguages } from "@/lib/use-languages";
import { AppShell } from "./app-shell";
import { CoverArt } from "./cover-art";
import { HeartIcon } from "./icons";
import { ErrorState, Loading } from "./status";
import { storyHref } from "./story-card";

type AudioStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

const READ_ALONG_KEY = "kasa:read-along";

/** The player page (/stories/:id): cover, audio, heart, read-along switch and a link to the next story. */
export function StoryPlayer({ id }: { id: string }) {
  const story = useApi((signal) => fetchStory(id, signal), [id]);
  const [audio, setAudio] = useState<AudioStatus>("idle");
  const [readAlong, setReadAlong] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { name } = useLanguages();
  const { isSaved, toggle } = useFavorites();
  const all = useApi((signal) => fetchStories(undefined, signal), []);

  // Listening is the default; the read-along choice is remembered on this device.
  useEffect(() => {
    try {
      setReadAlong(window.localStorage.getItem(READ_ALONG_KEY) === "on");
    } catch {
      /* storage blocked */
    }
  }, []);
  const changeReadAlong = (on: boolean) => {
    setReadAlong(on);
    try {
      window.localStorage.setItem(READ_ALONG_KEY, on ? "on" : "off");
    } catch {
      /* storage blocked */
    }
  };

  const back = (
    <Link href="/library" className="back-link glass">
      ← Library
    </Link>
  );

  if (story.status === "loading") {
    return (
      <AppShell current="Library">
        <div className="page-body">
          {back}
          <Loading label="Loading story…" />
        </div>
      </AppShell>
    );
  }
  if (story.status === "error") {
    const notFound = story.error instanceof ApiError && story.error.status === 404;
    return (
      <AppShell current="Library">
        <div className="page-body">
          {back}
          <ErrorState
            error={notFound ? new Error("We could not find that story.") : story.error}
            onRetry={notFound ? undefined : story.retry}
          />
        </div>
      </AppShell>
    );
  }

  const { title, text, language } = story.data;
  const saved = isSaved(id);
  const next =
    all.status === "success"
      ? (() => {
          const i = all.data.findIndex((s) => s.id === id);
          return all.data.length > 1 && i >= 0 ? all.data[(i + 1) % all.data.length] : undefined;
        })()
      : undefined;

  return (
    <AppShell current="Library">
      <article className="player" lang={htmlLang(language)}>
        <div className="player-top">{back}</div>
        <div className="player-cover">
          <CoverArt id={id}>
            <span className="cover-tag glass glass-on-art" lang="en">
              {name(language)}
            </span>
          </CoverArt>
        </div>

        <div className="player-panel glass">
          <div className="player-heading">
            <h1>{title}</h1>
            <button
              type="button"
              className="heart-button"
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save this story"}
              onClick={() => toggle(id)}
            >
              <HeartIcon />
            </button>
          </div>

          {/* Audio is synthesized on first request, so the first play can take a while. */}
          <audio
            key={attempt}
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
            <ErrorState
              error={new Error("The audio could not be played. Try again in a moment.")}
              onRetry={() => {
                setAudio("idle");
                setAttempt((n) => n + 1);
              }}
            />
          )}

          <label className="switch">
            <input
              type="checkbox"
              role="switch"
              checked={readAlong}
              onChange={(e) => changeReadAlong(e.target.checked)}
            />
            <span>Show the words</span>
          </label>
          {readAlong && <p className="story-text">{text}</p>}
        </div>

        {next && (
          <Link href={storyHref(next)} className="next-story glass">
            <span className="next-kicker">Next story</span>
            <span lang={htmlLang(next.language)}>{next.title}</span>
          </Link>
        )}
      </article>
    </AppShell>
  );
}
