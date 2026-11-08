"use client";

import Link from "next/link";
import { fetchStories } from "@/lib/api";
import { useFavorites } from "@/lib/favorites";
import { useApi } from "@/lib/use-api";
import { useLanguages } from "@/lib/use-languages";
import { AppShell } from "./app-shell";
import { ErrorState, Loading } from "./status";
import { StoryGrid } from "./story-grid";

/** The Saved page (/saved): stories the child hearted in the player. */
export function Saved() {
  const { ids } = useFavorites();
  const { name } = useLanguages();
  const stories = useApi((signal) => fetchStories(undefined, signal), []);

  return (
    <AppShell current="Saved">
      <header className="page-header">
        <h1>Saved</h1>
        <p>Your favourite stories, ready to hear again.</p>
      </header>

      <div className="page-body">
        {stories.status === "loading" && <Loading label="Loading stories…" />}
        {stories.status === "error" && <ErrorState error={stories.error} onRetry={stories.retry} />}
        {stories.status === "success" &&
          (() => {
            const saved = stories.data.filter((s) => ids.includes(s.id));
            return saved.length === 0 ? (
              <div className="empty glass">
                <p>No saved stories yet. Tap the heart on a story to keep it here.</p>
                <Link href="/library" className="button">
                  Browse the library
                </Link>
              </div>
            ) : (
              <StoryGrid stories={saved} label="Saved stories" languageName={name} />
            );
          })()}
      </div>
    </AppShell>
  );
}
