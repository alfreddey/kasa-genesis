"use client";

import Link from "next/link";
import { type CSSProperties, useState } from "react";
import { fetchLanguages, fetchStories, type StorySummary } from "@/lib/api";
import { htmlLang, shortLanguageName, storyOfTheDay } from "@/lib/home";
import {
  heardFraction,
  inProgress,
  type ListeningStore,
  starCount,
  useListening,
} from "@/lib/listening";
import { timeLeft } from "@/lib/time";
import { useApi } from "@/lib/use-api";
import { AppShell } from "./app-shell";
import { CoverArt } from "./cover-art";
import { ArrowRightIcon, PlayIcon, SparkleIcon, StarIcon } from "./icons";
import { LanguageFilter } from "./language-filter";
import { Mascot } from "./mascot";
import { ErrorState, Loading } from "./status";
import { StoryCard, storyHref } from "./story-card";

/**
 * The Home page: Ananse's greeting and the child's stars, the language picker, the story to keep
 * listening to (if one was stopped halfway), the story of the day and a shelf.
 */
export function Home() {
  const [language, setLanguage] = useState("");
  const languages = useApi((signal) => fetchLanguages(signal), []);
  const stories = useApi((signal) => fetchStories(undefined, signal), []);
  const listening = useListening();
  const stars = starCount(listening);

  const names = new Map(
    languages.status === "success"
      ? languages.data.map((l) => [l.code, shortLanguageName(l.name)])
      : [],
  );
  const languageName = (code: string) => names.get(code) ?? code;

  return (
    <AppShell current="Home">
      <header className="greeting">
        <div className="greeting-text">
          <h1>Akwaaba!</h1>
          <p>What story shall we hear today?</p>
          <span className="ribbon" aria-hidden="true" />
          {stars > 0 && (
            <div className="star-count">
              <StarIcon />
              <span>
                <b>{stars}</b> {stars === 1 ? "story" : "stories"} heard
              </span>
            </div>
          )}
        </div>
        <Mascot hanging className="greeting-mascot mascot-swing" />
      </header>

      {languages.status === "success" && languages.data.length > 0 && (
        <div className="section">
          <LanguageFilter languages={languages.data} value={language} onChange={setLanguage} />
        </div>
      )}

      {stories.status === "loading" && (
        <div className="section">
          <Loading label="Loading stories…" />
        </div>
      )}
      {stories.status === "error" && (
        <div className="section">
          <ErrorState error={stories.error} onRetry={stories.retry} />
        </div>
      )}
      {stories.status === "success" && (
        <Shelves
          stories={stories.data.filter((s) => !language || s.language === language)}
          languageName={languageName}
          listening={listening}
        />
      )}
    </AppShell>
  );
}

function Shelves({
  stories,
  languageName,
  listening,
}: {
  stories: StorySummary[];
  languageName: (code: string) => string;
  listening: ListeningStore;
}) {
  const featured = storyOfTheDay(stories);
  if (!featured) {
    return (
      <div className="section">
        <p className="status">No stories yet.</p>
      </div>
    );
  }
  const others = stories.filter((s) => s.id !== featured.id);
  // The story the child stopped in the middle of most recently, if it is still on the shelf.
  const resume = inProgress(listening)
    .map((id) => stories.find((s) => s.id === id))
    .find((s) => s !== undefined);
  const heard = resume && listening[resume.id];

  return (
    <>
      {resume && heard && (
        <div className="section">
          <Link href={storyHref(resume)} className="keep-listening">
            <span className="keep-art">
              <CoverArt id={resume.id} />
            </span>
            <span className="keep-text">
              <span className="kicker">Keep listening</span>
              <span className="keep-title" lang={htmlLang(resume.language)}>
                {resume.title}
              </span>
              <span
                className="keep-track"
                aria-hidden="true"
                style={
                  { "--progress": `${Math.round(heardFraction(heard) * 100)}%` } as CSSProperties
                }
              />
              <span className="keep-left">{timeLeft(heard.duration - heard.position)}</span>
            </span>
            <span className="play-fab play-fab-small" aria-hidden="true">
              <PlayIcon />
            </span>
          </Link>
        </div>
      )}

      <div className="section">
        <Link href={storyHref(featured)} className="featured">
          <span className="featured-art">
            <CoverArt id={featured.id} />
            <span className="chip chip-on-art">{languageName(featured.language)}</span>
          </span>
          <span className="featured-body">
            <span className="kicker">
              <SparkleIcon />
              Story of the day
            </span>
            <span className="featured-title" lang={htmlLang(featured.language)}>
              {featured.title}
            </span>
            <span className="featured-cta">
              <span className="play-fab" aria-hidden="true">
                <PlayIcon />
              </span>
              <span className="featured-cta-label">Listen</span>
            </span>
          </span>
        </Link>
      </div>

      {others.length > 0 && (
        <>
          <div className="section shelf-header">
            <h2>New stories</h2>
            <Link href="/library" className="btn btn-paper btn-small">
              See all
              <ArrowRightIcon />
            </Link>
          </div>
          <ul className="shelf" aria-label="New stories">
            {others.map((s) => (
              <li key={s.id}>
                <StoryCard story={s} language={languageName(s.language)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
