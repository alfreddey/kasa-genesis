import type { AudioManifest } from "./api";

/** A piece of the story text: a sentence that is read aloud, or the text between sentences. */
export type Segment = { text: string; index: number | null };

/**
 * Lays the manifest's sentences over the story text, in order, so the sentence being read can
 * be highlighted while the paragraphs and punctuation stay as written. Returns null when a
 * sentence cannot be found in the text (then the plain text is shown instead).
 */
export function layOut(text: string, sentences: readonly string[]): Segment[] | null {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const [index, sentence] of sentences.entries()) {
    const at = text.indexOf(sentence, cursor);
    if (at < 0) return null;
    if (at > cursor) segments.push({ text: text.slice(cursor, at), index: null });
    segments.push({ text: sentence, index });
    cursor = at + sentence.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), index: null });
  return segments;
}

/**
 * The sentence being read `seconds` into the whole-story audio. The silence after a sentence
 * counts as part of it, so the highlight moves on exactly when the next sentence starts.
 */
export function sentenceAt(manifest: AudioManifest, seconds: number): number {
  let start = 0;
  for (const [i, s] of manifest.sentences.entries()) {
    const end = start + s.duration_seconds + manifest.pause_seconds;
    if (seconds < end) return i;
    start = end;
  }
  return Math.max(manifest.sentences.length - 1, 0);
}
