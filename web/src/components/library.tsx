"use client";

import { useState } from "react";
import { fetchStories } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useLanguages } from "@/lib/use-languages";
import { AppShell } from "./app-shell";
import { LanguageFilter } from "./language-filter";
import { ErrorState, Loading } from "./status";
import { StoryGrid } from "./story-grid";

/** The Library page (/library): every story as a big cover, with search and a language filter. */
export function Library() {
  const [language, setLanguage] = useState("");
  const [query, setQuery] = useState("");
  const { languages, name } = useLanguages();
  const stories = useApi((signal) => fetchStories(language || undefined, signal), [language]);

  const needle = query.trim().toLowerCase();

  return (
    <AppShell current="Library">
      <header className="page-header">
        <h1>Library</h1>
        <p>Pick a story to hear.</p>
      </header>

      <div className="page-controls">
        <label className="search glass">
          <span className="visually-hidden">Search stories</span>
          <input
            type="search"
            placeholder="Search stories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {languages.status === "success" && (
          <LanguageFilter languages={languages.data} value={language} onChange={setLanguage} />
        )}
      </div>

      <div className="page-body">
        {stories.status === "loading" && <Loading label="Loading stories…" />}
        {stories.status === "error" && <ErrorState error={stories.error} onRetry={stories.retry} />}
        {stories.status === "success" &&
          (() => {
            const shown = stories.data.filter(
              (s) => !needle || s.title.toLowerCase().includes(needle),
            );
            return shown.length === 0 ? (
              <p className="status">
                {stories.data.length === 0 ? "No stories yet." : "No stories match your search."}
              </p>
            ) : (
              <StoryGrid stories={shown} label="Stories" languageName={name} />
            );
          })()}
      </div>
    </AppShell>
  );
}
