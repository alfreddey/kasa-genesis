import type { Language } from "@/lib/api";
import { shortLanguageName } from "@/lib/home";

/** Language picker: All plus one chunky button per language. The chosen one is pressed in. */
export function LanguageFilter({
  languages,
  value,
  onChange,
}: {
  languages: Language[];
  value: string;
  onChange: (code: string) => void;
}) {
  if (languages.length === 0) return null;
  return (
    <div className="segmented" role="group" aria-label="Language">
      <button
        type="button"
        className="segment"
        aria-pressed={value === ""}
        onClick={() => onChange("")}
      >
        All
      </button>
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          className="segment"
          aria-pressed={value === l.code}
          onClick={() => onChange(l.code)}
        >
          {shortLanguageName(l.name)}
        </button>
      ))}
    </div>
  );
}
