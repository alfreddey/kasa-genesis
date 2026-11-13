"use client";

import { useSyncExternalStore } from "react";

const KEY = "kasa:listening";
/** Stopping this close to the start or the end is not "in the middle of a story". */
export const EDGE_SECONDS = 5;

export type Listening = {
  /** Seconds into the story where the child stopped. 0 when there is nothing to pick up. */
  position: number;
  /** Length of the story in seconds, as the browser last reported it. */
  duration: number;
  /** True once the child has heard the story to the end. That is one star. */
  finished: boolean;
  /** When this was last saved (ms since 1970). The newest unfinished story is "Keep listening". */
  updatedAt: number;
};
export type ListeningStore = Record<string, Listening>;

const EMPTY: ListeningStore = {};
const listeners = new Set<() => void>();
let cache: { raw: string | null; store: ListeningStore } = { raw: null, store: EMPTY };

const isTime = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;

function isEntry(x: unknown): x is Listening {
  if (typeof x !== "object" || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    isTime(e.position) &&
    isTime(e.duration) &&
    isTime(e.updatedAt) &&
    typeof e.finished === "boolean"
  );
}

function read(): ListeningStore {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* storage blocked: behave as empty */
  }
  if (raw === cache.raw) return cache.store;
  const store: ListeningStore = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      for (const [id, entry] of Object.entries(parsed)) if (isEntry(entry)) store[id] = entry;
    }
  } catch {
    /* corrupt value: ignore it */
  }
  cache = { raw, store };
  return store;
}

function write(store: ListeningStore) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage blocked: the change is lost on reload */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** What this browser remembers about one story, if anything. */
export function readListening(id: string): Listening | undefined {
  return read()[id];
}

/**
 * Remembers where the child stopped, so the story can go on from there next time. A stop in the
 * first or last few seconds is not worth picking up: the story then simply starts from the top.
 */
export function saveProgress(id: string, position: number, duration: number, now = Date.now()) {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
  const store = read();
  const before = store[id];
  const middle = position >= EDGE_SECONDS && position <= duration - EDGE_SECONDS;
  const finished = before?.finished ?? false;
  const rest = { ...store };
  if (middle || finished) {
    rest[id] = {
      position: middle ? Math.round(position * 10) / 10 : 0,
      duration,
      finished,
      updatedAt: now,
    };
  } else if (before) {
    delete rest[id];
  } else {
    return;
  }
  write(rest);
}

/** The child heard the story to the end: keep the star and forget the position. */
export function markFinished(id: string, duration: number, now = Date.now()) {
  const store = read();
  const known = Number.isFinite(duration) && duration > 0 ? duration : (store[id]?.duration ?? 0);
  write({ ...store, [id]: { position: 0, duration: known, finished: true, updatedAt: now } });
}

/** Forgets every star and every place on this device (the Parents page offers this). */
export function clearListening() {
  write({});
}

/** Ids of the stories the child stopped in the middle of, the most recent first. */
export function inProgress(store: ListeningStore): string[] {
  return Object.keys(store)
    .filter((id) => store[id]!.position > 0)
    .sort((a, b) => store[b]!.updatedAt - store[a]!.updatedAt);
}

/** One star for every story heard to the end. */
export function starCount(store: ListeningStore): number {
  return Object.values(store).filter((entry) => entry.finished).length;
}

/** How far into the story the child is, from 0 to 1 (0 when nothing is remembered). */
export function heardFraction(entry: Listening | undefined): number {
  return entry && entry.duration > 0 ? Math.min(1, entry.position / entry.duration) : 0;
}

/**
 * What the child has listened to, kept in this browser until accounts with child profiles exist:
 * where each story was stopped and which stories were heard to the end.
 */
export function useListening(): ListeningStore {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
