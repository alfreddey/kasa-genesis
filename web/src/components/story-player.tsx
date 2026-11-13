"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  ApiError,
  fetchManifest,
  fetchStories,
  fetchStory,
  storyAudioUrl,
  type StorySummary,
} from "@/lib/api";
import { useFavorites } from "@/lib/favorites";
import { htmlLang } from "@/lib/home";
import {
  markFinished,
  readListening,
  saveProgress,
  starCount,
  useListening,
} from "@/lib/listening";
import { layOut, sentenceAt } from "@/lib/read-along";
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
  StarIcon,
} from "./icons";
import { Mascot } from "./mascot";
import { ErrorState, Loading } from "./status";
import { storyHref } from "./story-card";

type AudioStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

/** What the audio element last told us about one story. */
type Heard = { id: string; position: number; duration: number; saved: number; resumeTo: number };

/** Writes down where the child is. Nothing is known while the audio is still loading, or while
 * a story that was picked up is still finding its place. */
function writeDown(h: Heard) {
  if (h.duration <= 0 || h.resumeTo > 0) return;
  h.saved = h.position;
  saveProgress(h.id, h.position, h.duration);
}

const READ_ALONG_KEY = "kasa:read-along";
const SKIP_SECONDS = 10;
/** While a story plays, where the child is gets written down this often. */
const REMEMBER_EVERY_SECONDS = 5;

/**
 * The player page (/stories/:id). Listening comes first: a big cover, one big play button, a
 * chunky progress bar and 10-second skips. The words are an extra the reader switches on.
 * The player remembers where the child stopped and goes on from there next time, and a story
 * heard to the end gets a happy ending and a star.
 */
export function StoryPlayer({ id }: { id: string }) {
  const story = useApi((signal) => fetchStory(id, signal), [id]);
  const [audio, setAudio] = useState<AudioStatus>("idle");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canSeek, setCanSeek] = useState(false);
  const [readAlong, setReadAlong] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Seconds into the story where the child stopped last time (0: start from the top). The next
  // press of play goes on from there.
  const [resumeAt, setResumeAt] = useState(0);
  // The happy ending: shown when the story played to its end, with a star the first time.
  const [theEnd, setTheEnd] = useState<"star" | "again" | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const theEndRef = useRef<HTMLDivElement>(null);
  // What the audio element last told us, kept outside of state so that leaving the page or
  // locking the phone can still write it down.
  const heard = useRef<Heard>({ id, position: 0, duration: 0, saved: 0, resumeTo: 0 });
  const { name } = useLanguages();
  const { isSaved, toggle } = useFavorites();
  const all = useApi((signal) => fetchStories(undefined, signal), []);
  // The sentence list is only needed to highlight words, so it is asked for when they are shown.
  const sentences = useApi(
    (signal) => (readAlong ? fetchManifest(id, signal) : Promise.resolve(null)),
    [id, readAlong],
  );
  const listening = useListening();
  const stars = starCount(listening);

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

  // Another story starts fresh, at the place where the child stopped in it (if anywhere). The
  // remembered length lets the progress bar show that place before any audio has loaded.
  useEffect(() => {
    const before = readListening(id);
    const at = before && before.position > 0 ? before.position : 0;
    heard.current = { id, position: 0, duration: 0, saved: 0, resumeTo: 0 };
    setAudio("idle");
    setPosition(at);
    setDuration(at > 0 ? before!.duration : 0);
    setCanSeek(false);
    setResumeAt(at);
    setTheEnd(null);

    // Locking the phone or leaving the story writes the place down too.
    const onHide = () => {
      if (document.visibilityState === "hidden") writeDown(heard.current);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      writeDown(heard.current);
    };
  }, [id]);

  // The happy ending may appear below the fold on a phone: bring it into view. (The story is
  // over, so nothing the child was doing is interrupted.)
  useEffect(() => {
    if (!theEnd) return;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    theEndRef.current?.scrollIntoView?.({ block: "center", behavior: calm ? "auto" : "smooth" });
  }, [theEnd]);

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

  // Only events of this very story count (a late one from the story before does not).
  const mine = () => heard.current.id === id;
  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!el.paused && !el.ended) {
      el.pause();
      return;
    }
    if (el.ended) el.currentTime = 0;
    else if (resumeAt > 0) {
      // Go on where the child stopped. Nothing has loaded yet (preload is "none"), so the
      // browser keeps this as the place to start from; readMedia() checks that it got there.
      heard.current.resumeTo = resumeAt;
      try {
        el.currentTime = resumeAt;
      } catch {
        /* a browser that cannot take a start time yet: readMedia() seeks once it has loaded */
      }
      setResumeAt(0);
    }
    // play() rejects when it is interrupted (for example by a quick pause). Real failures arrive
    // through the element's error event, so the rejection itself can be ignored.
    void Promise.resolve(el.play()).catch(() => undefined);
  };
  const seek = (to: number) => {
    const el = audioRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(to, 0), duration);
    el.currentTime = clamped;
    heard.current.position = clamped;
    setPosition(clamped);
  };
  const startAgain = () => {
    setResumeAt(0);
    setPosition(0);
    saveProgress(id, 0, duration);
  };
  const readMedia = (el: HTMLAudioElement) => {
    if (!mine()) return;
    // An unknown length keeps the last known one, so the bar does not jump while audio loads.
    const length = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    if (length > 0) {
      heard.current.duration = length;
      setDuration(length);
    }
    const ranges = el.seekable;
    const seekableNow = Boolean(ranges) && ranges.length > 0 && ranges.end(ranges.length - 1) > 0;
    setCanSeek(seekableNow);
    // The audio has loaded: make sure a story that was picked up really is at that place.
    const to = heard.current.resumeTo;
    if (to > 0 && length > 0) {
      if (Math.abs(el.currentTime - to) <= 1) {
        heard.current.resumeTo = 0;
        heard.current.position = el.currentTime;
      } else if (seekableNow) {
        heard.current.resumeTo = 0;
        heard.current.position = Math.min(to, length);
        el.currentTime = heard.current.position;
      }
    }
  };
  const readTime = (el: HTMLAudioElement) => {
    // Until a picked-up story has loaded, the element may still say 0: keep showing the place.
    if (!mine() || heard.current.resumeTo > 0) return;
    const t = el.currentTime;
    heard.current.position = t;
    setPosition(t);
    if (Math.abs(t - heard.current.saved) >= REMEMBER_EVERY_SECONDS) writeDown(heard.current);
  };

  const playLabel = active
    ? "Pause"
    : audio === "ended"
      ? "Play again"
      : resumeAt > 0
        ? "Keep listening"
        : "Play";
  const progress = known ? Math.min(100, (position / duration) * 100) : 0;
  // The sentence being read, once the child has started. If the list is missing or does not
  // match the text, the words are shown without a highlight.
  const manifest = sentences.status === "success" ? sentences.data : null;
  const laidOut = manifest
    ? layOut(
        text,
        manifest.sentences.map((s) => s.text),
      )
    : null;
  const current =
    manifest && (active || audio === "paused" || position > 0)
      ? sentenceAt(manifest, position)
      : -1;

  return (
    <AppShell current="Library">
      <article className="player">
        <div className="player-top">{back}</div>

        <div className="player-art" data-active={active || undefined}>
          <CoverArt id={id} />
          <span className="chip chip-on-art">{name(language)}</span>
          <Mascot hanging className={`player-mascot ${active ? "mascot-bob" : "mascot-swing"}`} />
          {listening[id]?.finished && (
            <span className={`star-badge${theEnd === "star" ? " star-badge-new" : ""}`}>
              <StarIcon />
              <span className="visually-hidden">Heard to the end.</span>
            </span>
          )}
        </div>

        <div className="player-panel paper">
          <div className="player-heading">
            <h1 lang={htmlLang(language)}>{title}</h1>
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
            onPlay={() => {
              setAudio("loading");
              setTheEnd(null);
            }}
            onWaiting={() => setAudio("loading")}
            onPlaying={() => {
              // If the browser could not jump to the remembered place, the story simply plays
              // from wherever it is.
              heard.current.resumeTo = 0;
              setAudio("playing");
            }}
            onPause={() => {
              setAudio("paused");
              if (mine()) writeDown(heard.current);
            }}
            onEnded={() => {
              setAudio("ended");
              setTheEnd(readListening(id)?.finished ? "again" : "star");
              markFinished(id, heard.current.duration);
            }}
            onError={() => setAudio("error")}
            onTimeUpdate={(e) => readTime(e.currentTarget)}
            onSeeked={(e) => {
              // A drag or a skip while paused: show the new time, and offer "Play again" when
              // the child dragged all the way to the end (pressing play there starts over).
              const el = e.currentTarget;
              readTime(el);
              if (el.paused)
                setAudio((now) => (el.ended ? "ended" : now === "ended" ? "paused" : now));
              if (!el.ended) setTheEnd(null);
            }}
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

          {resumeAt > 0 && audio === "idle" && (
            <button
              type="button"
              className="btn btn-paper btn-small start-again"
              aria-label="Start again from the beginning"
              onClick={startAgain}
            >
              <RestartIcon />
              Start again
            </button>
          )}

          {audio === "loading" && <Loading label="Preparing the audio…" />}
          {theEnd && audio === "ended" && (
            <div className="the-end" ref={theEndRef}>
              <div className="the-end-cheer">
                <span className="the-end-art" aria-hidden="true">
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                  <Mascot className="mascot-bob" />
                </span>
                <div className="the-end-text" role="status">
                  <p className="the-end-title">The end!</p>
                  <p>
                    {theEnd === "again"
                      ? "You heard the whole story again."
                      : stars > 1
                        ? `You won a star! Now you have ${stars}.`
                        : "You won your first star!"}
                  </p>
                </div>
              </div>
              {next && <NextStory story={next} />}
            </div>
          )}
          {audio === "error" && (
            <ErrorState
              error={new Error("The audio could not be played. Try again in a moment.")}
              onRetry={() => {
                setAudio("idle");
                setPosition(0);
                setDuration(0);
                setCanSeek(false);
                setResumeAt(0);
                heard.current = { id, position: 0, duration: 0, saved: 0, resumeTo: 0 };
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
          {readAlong && laidOut && (
            <p className="story-text story-text-flow" lang={htmlLang(language)}>
              {laidOut.map((piece, i) =>
                piece.index === null ? (
                  piece.text
                ) : (
                  <span
                    key={i}
                    className="sentence"
                    data-current={piece.index === current || undefined}
                  >
                    {piece.text}
                  </span>
                ),
              )}
            </p>
          )}
          {readAlong && !laidOut && (
            <div className="story-text" lang={htmlLang(language)}>
              {text.split(/\n\s*\n/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>

        {/* At the happy ending the next story sits right under "The end!" instead. */}
        {next && !(theEnd && audio === "ended") && <NextStory story={next} />}
      </article>
    </AppShell>
  );
}

function NextStory({ story }: { story: StorySummary }) {
  return (
    <Link href={storyHref(story)} className="next-story">
      <span className="next-art">
        <CoverArt id={story.id} />
      </span>
      <span className="next-text">
        <span className="kicker">Next story</span>
        <span className="next-title" lang={htmlLang(story.language)}>
          {story.title}
        </span>
      </span>
      <span className="next-arrow" aria-hidden="true">
        <ArrowRightIcon />
      </span>
    </Link>
  );
}
