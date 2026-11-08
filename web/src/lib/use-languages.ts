"use client";

import { fetchLanguages } from "@/lib/api";
import { shortLanguageName } from "@/lib/home";
import { useApi } from "@/lib/use-api";

/** Loads the languages once and gives a `name(code)` that falls back to the code while loading. */
export function useLanguages() {
  const languages = useApi((signal) => fetchLanguages(signal), []);
  const names = new Map(
    languages.status === "success"
      ? languages.data.map((l) => [l.code, shortLanguageName(l.name)])
      : [],
  );
  return { languages, name: (code: string) => names.get(code) ?? code };
}
