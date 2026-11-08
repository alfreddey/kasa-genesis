"use client";

import Link from "next/link";
import { useState } from "react";
import { fetchLanguages, fetchStories, type StorySummary } from "@/lib/api";
import { shortLanguageName, storyOfTheDay } from "@/lib/home";
import { useApi } from "@/lib/use-api";
import { CoverArt } from "./cover-art";
import { PersonIcon, PlayIcon } from "./icons";
import { ErrorState, Loading } from "./status";
import { TabBar } from "./tab-bar";

const storyHref = (s: StorySummary) => `/stories/${encodeURIComponent(s.id)}`;

/** The Home page: greeting, language tiles, the story of the day and a shelf of the rest. */
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
    <div className="home">
      <div className="home-backdrop" aria-hidden="true">
        <div className="savanna-stage">
          <span className="savanna-sun" />
          <span className="savanna-hill savanna-hill-1" />
          <span className="savanna-hill savanna-hill-2" />
          <span className="savanna-hill savanna-hill-3" />
          <span className="savanna-hill savanna-hill-4" />
        </div>
      </div>

      <div className="home-column">
        <header className="home-header">
          <div className="home-greeting">
            <h1>Akwaaba!</h1>
            <p>What story shall we hear today?</p>
          </div>

          {languages.status === "success" && languages.data.length > 0 && (
            <div className="language-filter">
              <div className="segmented glass" role="group" aria-label="Language">
                <button
                  type="button"
                  className="segment"
                  aria-pressed={language === ""}
                  onClick={() => setLanguage("")}
                >
                  All
                </button>
                {languages.data.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className="segment"
                    aria-pressed={language === l.code}
                    onClick={() => setLanguage(l.code)}
                  >
                    {languageName(l.code)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="child-avatar" aria-hidden="true">
            <PersonIcon />
          </div>
        </header>

        {stories.status === "loading" && (
          <div className="featured-wrap">
            <Loading label="Loading stories…" />
          </div>
        )}
        {stories.status === "error" && (
          <div className="featured-wrap">
            <ErrorState error={stories.error} onRetry={stories.retry} />
          </div>
        )}
        {stories.status === "success" && (
          <Shelves
            stories={stories.data.filter((s) => !language || s.language === language)}
            languageName={languageName}
          />
        )}
      </div>

      <TabBar current="Home" />
    </div>
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
      <div className="featured-wrap">
        <p className="status">No stories yet.</p>
      </div>
    );
  }
  const others = stories.filter((s) => s.id !== featured.id);

  return (
    <>
      <div className="featured-wrap">
        <Link href={storyHref(featured)} className="featured">
          <CoverArt id={featured.id}>
            <span className="cover-tag glass glass-on-art">{languageName(featured.language)}</span>
          </CoverArt>
          <span className="featured-panel glass glass-on-art">
            <span className="featured-text">
              <p className="featured-kicker">Story of the day</p>
              <span className="featured-title" lang={featured.language}>
                {featured.title}
              </span>
              <p className="featured-meta">{languageName(featured.language)}</p>
            </span>
            <span className="play-button" aria-hidden="true">
              <PlayIcon />
            </span>
          </span>
        </Link>
      </div>

      {others.length > 0 && (
        <>
          <div className="shelf-header">
            <h2>New stories</h2>
            <Link href="/library" className="glass">
              See all
            </Link>
          </div>
          <ul className="shelf" aria-label="New stories">
            {others.map((s) => (
              <li key={s.id}>
                <Link href={storyHref(s)} className="story-card">
                  <CoverArt id={s.id}>
                    <span className="cover-tag glass glass-on-art">{languageName(s.language)}</span>
                    <span className="play-glass glass glass-on-art">
                      <PlayIcon />
                    </span>
                  </CoverArt>
                  <span className="story-card-title" lang={s.language}>
                    {s.title}
                  </span>
                  <span className="story-card-language">{languageName(s.language)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
