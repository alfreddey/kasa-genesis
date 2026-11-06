"use client";

import Link from "next/link";
import { useState } from "react";
import { fetchLanguages, fetchStories } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { ErrorState, Loading } from "./status";

export function StoryList() {
  const [language, setLanguage] = useState("");
  const languages = useApi((signal) => fetchLanguages(signal), []);
  const stories = useApi((signal) => fetchStories(language || undefined, signal), [language]);

  const languageName = (code: string) =>
    (languages.status === "success" && languages.data.find((l) => l.code === code)?.name) || code;

  return (
    <section aria-labelledby="stories-heading">
      <div className="toolbar">
        <h2 id="stories-heading">Stories</h2>
        {languages.status === "success" && (
          <label>
            Language{" "}
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="">All</option>
              {languages.data.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {stories.status === "loading" && <Loading label="Loading stories…" />}
      {stories.status === "error" && <ErrorState error={stories.error} onRetry={stories.retry} />}
      {stories.status === "success" &&
        (stories.data.length === 0 ? (
          <p className="status">No stories yet.</p>
        ) : (
          <ul className="story-list">
            {stories.data.map((s) => (
              <li key={s.id}>
                <Link href={`/stories/${encodeURIComponent(s.id)}`}>{s.title}</Link>
                <span className="muted"> · {languageName(s.language)}</span>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
