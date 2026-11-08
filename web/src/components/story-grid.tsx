import type { StorySummary } from "@/lib/api";
import { StoryCard } from "./story-card";

/** Big cover grid: 2 columns on a phone, 3 on a tablet, 5 on a desktop. */
export function StoryGrid({
  stories,
  label,
  languageName,
}: {
  stories: StorySummary[];
  label: string;
  languageName: (code: string) => string;
}) {
  return (
    <ul className="story-grid" aria-label={label}>
      {stories.map((s) => (
        <li key={s.id}>
          <StoryCard story={s} language={languageName(s.language)} />
        </li>
      ))}
    </ul>
  );
}
