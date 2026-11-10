"use client";

import Link from "next/link";
import { useState } from "react";
import { fetchLanguages, fetchStories, type StorySummary } from "@/lib/api";
import { shortLanguageName, storyOfTheDay } from "@/lib/home";
import { useApi } from "@/lib/use-api";
import { AppShell } from "./app-shell";
import { CoverArt } from "./cover-art";
import { ArrowRightIcon, PlayIcon, SparkleIcon } from "./icons";
import { LanguageFilter } from "./language-filter";
import { Mascot } from "./mascot";
import { ErrorState, Loading } from "./status";
import { StoryCard, storyHref } from "./story-card";

/** The Home page: Ananse's greeting, the language picker, the story of the day and a shelf. */
export function Home() {
  const [language, setLanguage] = useState("");
  const languages = useApi((signal) => fetchLanguages(signal), []);
  const stories = useApi((signal) => fetchStories(undefined, signal), []);

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
        />
      )}
    </AppShell>
  );
}

function Shelves({
  stories,
  languageName,
}: {
  stories: StorySummary[];
  languageName: (code: string) => string;
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

  return (
    <>
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
            <span className="featured-title" lang={featured.language}>
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
