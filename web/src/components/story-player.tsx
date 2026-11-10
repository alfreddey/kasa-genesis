"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ApiError, fetchStories, fetchStory, storyAudioUrl } from "@/lib/api";
import { useFavorites } from "@/lib/favorites";
import { formatTime, spokenTime } from "@/lib/time";
import { useApi } from "@/lib/use-api";
import { useLanguages } from "@/lib/use-languages";
import { AppShell } from "./app-shell";
import { CoverArt } from "./cover-art";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BackIcon,
  ForwardIcon,
  HeartIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
} from "./icons";
import { Mascot } from "./mascot";
import { ErrorState, Loading } from "./status";
import { storyHref } from "./story-card";

type AudioStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

const READ_ALONG_KEY = "kasa:read-along";
const SKIP_SECONDS = 10;

/**
 * The player page (/stories/:id). Listening comes first: a big cover, one big play button, a
 * chunky progress bar and 10-second skips. The words are an extra the reader switches on.
 */
export function StoryPlayer({ id }: { id: string }) {
  const story = useApi((signal) => fetchStory(id, signal), [id]);
  const [audio, setAudio] = useState<AudioStatus>("idle");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canSeek, setCanSeek] = useState(false);
  const [readAlong, setReadAlong] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
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

  // Another story starts from the beginning.
  useEffect(() => {
    setAudio("idle");
    setPosition(0);
    setDuration(0);
    setCanSeek(false);
  }, [id]);

  const back = (
    <Link href="/library" className="btn btn-paper btn-small" aria-label="Back to the library">
      <ArrowLeftIcon />
      Library
    </Link>
  );

  if (story.status === "loading") {
    return (
      <AppShell current="Library">
        <div className="section">
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
        <div className="section">
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

  // "loading" counts as active: the child pressed play and the button already shows pause.
  const active = audio === "playing" || audio === "loading";
  const known = duration > 0;
  // Skipping and dragging only work once the browser says it can seek in this audio (the
  // server has to answer Range requests). Until then those controls stay switched off,
  // because a failed seek would throw the child back to the start of the story.
  const seekable = known && canSeek;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!el.paused && !el.ended) {
      el.pause();
      return;
    }
    if (el.ended) el.currentTime = 0;
    // play() rejects when it is interrupted (for example by a quick pause). Real failures arrive
    // through the element's error event, so the rejection itself can be ignored.
    void Promise.resolve(el.play()).catch(() => undefined);
  };
  const seek = (to: number) => {
    const el = audioRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(to, 0), duration);
    el.currentTime = clamped;
    setPosition(clamped);
  };
  const readMedia = (el: HTMLAudioElement) => {
    setDuration(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0);
    const ranges = el.seekable;
    setCanSeek(Boolean(ranges) && ranges.length > 0 && ranges.end(ranges.length - 1) > 0);
  };

  const playLabel = active ? "Pause" : audio === "ended" ? "Play again" : "Play";
  const progress = known ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <AppShell current="Library">
      <article className="player">
        <div className="player-top">{back}</div>

        <div className="player-art" data-active={active || undefined}>
          <CoverArt id={id} />
          <span className="chip chip-on-art">{name(language)}</span>
          <Mascot hanging className={`player-mascot ${active ? "mascot-bob" : "mascot-swing"}`} />
        </div>

        <div className="player-panel paper">
          <div className="player-heading">
            <h1 lang={language}>{title}</h1>
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

          {/* Audio is synthesized on first request, so the first play can take a while. The
              element has no native controls: the buttons below drive it. */}
          <audio
            key={attempt}
            ref={audioRef}
            preload="none"
            src={storyAudioUrl(id)}
            aria-label={`Listen to ${title}`}
            onPlay={() => setAudio("loading")}
            onWaiting={() => setAudio("loading")}
            onPlaying={() => setAudio("playing")}
            onPause={() => setAudio("paused")}
            onEnded={() => setAudio("ended")}
            onError={() => setAudio("error")}
            onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => readMedia(e.currentTarget)}
            onDurationChange={(e) => readMedia(e.currentTarget)}
            onProgress={(e) => readMedia(e.currentTarget)}
            onCanPlay={(e) => readMedia(e.currentTarget)}
          />

          <div className="transport">
            <button
              type="button"
              className="skip-button"
              aria-label={`Back ${SKIP_SECONDS} seconds`}
              disabled={!seekable}
              onClick={() => seek(position - SKIP_SECONDS)}
            >
              <BackIcon />
              <span aria-hidden="true">{SKIP_SECONDS}</span>
            </button>
            <button
              type="button"
              className="play-main"
              aria-label={playLabel}
              data-active={active || undefined}
              onClick={togglePlay}
            >
              {active ? <PauseIcon /> : audio === "ended" ? <RestartIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              className="skip-button"
              aria-label={`Forward ${SKIP_SECONDS} seconds`}
              disabled={!seekable}
              onClick={() => seek(position + SKIP_SECONDS)}
            >
              <ForwardIcon />
              <span aria-hidden="true">{SKIP_SECONDS}</span>
            </button>
          </div>

          <div className="progress">
            <input
              type="range"
              className="progress-bar"
              aria-label="Story progress"
              aria-valuetext={`${spokenTime(position)} of ${spokenTime(duration)}`}
              min={0}
              max={known ? duration : 1}
              step="any"
              value={known ? Math.min(position, duration) : 0}
              disabled={!seekable}
              style={{ "--progress": `${progress}%` } as CSSProperties}
              onChange={(e) => seek(Number(e.target.value))}
            />
            <div className="progress-times" aria-hidden="true">
              <span>{formatTime(position)}</span>
              <span>{known ? formatTime(duration) : ""}</span>
            </div>
          </div>

          {audio === "loading" && <Loading label="Preparing the audio…" />}
          {audio === "error" && (
            <ErrorState
              error={new Error("The audio could not be played. Try again in a moment.")}
              onRetry={() => {
                setAudio("idle");
                setPosition(0);
                setDuration(0);
                setCanSeek(false);
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
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">Show the words</span>
          </label>
          {readAlong && (
            <div className="story-text" lang={language}>
              {text.split(/\n\s*\n/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>

        {next && (
          <Link href={storyHref(next)} className="next-story">
            <span className="next-art">
              <CoverArt id={next.id} />
            </span>
            <span className="next-text">
              <span className="kicker">Next story</span>
              <span className="next-title" lang={next.language}>
                {next.title}
              </span>
            </span>
            <span className="next-arrow" aria-hidden="true">
              <ArrowRightIcon />
            </span>
          </Link>
        )}
      </article>
    </AppShell>
  );
}
