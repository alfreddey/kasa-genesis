/**
 * Typed client for the Kasa API (/api/v1, issue #4).
 * Every call goes through apiFetch, so the base URL, timeout and error shape live in one place.
 * Types come from api/openapi.json (api-types.gen.ts, made by `npm run generate:api`).
 */

import type { components } from "./api-types.gen";

export type Language = components["schemas"]["Language"];
export type StorySummary = components["schemas"]["StorySummary"];
export type Story = components["schemas"]["Story"];

const DEFAULT_API_URL = "http://localhost:8000";
const TIMEOUT_MS = 10_000;

/** Base URL of the API, from NEXT_PUBLIC_API_URL (baked in at build time). */
export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
}

export function apiUrl(path: string): string {
  return `${apiBaseUrl()}/api/v1${path}`;
}

/** A failed API call. status is 0 when the API could not be reached at all. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
      signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (init?.signal?.aborted) throw err; // The caller cancelled; not an API failure.
    const timedOut = (err as { name?: unknown } | null)?.name === "TimeoutError";
    throw new ApiError(
      timedOut ? "The server is taking too long to answer." : "Could not reach the server.",
      0,
    );
  }
  if (!res.ok) {
    throw new ApiError(friendlyMessage(res, await errorDetail(res)), res.status);
  }
  return (await res.json()) as T;
}

/** Rate limits and server faults get a plain message the reader can act on. */
function friendlyMessage(res: Response, detail: string): string {
  if (res.status === 429) {
    const seconds = Number(res.headers.get("Retry-After"));
    return Number.isFinite(seconds) && seconds > 0
      ? `Too many requests. Please wait ${Math.ceil(seconds)} seconds and try again.`
      : "Too many requests. Please wait a moment and try again.";
  }
  if (res.status >= 500) return "The server had a problem. Please try again in a moment.";
  return detail;
}

/** The API sends errors as {"detail": string}; fall back to the status text otherwise. */
async function errorDetail(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // Not JSON.
  }
  return res.statusText || `Request failed (${res.status})`;
}

export function fetchLanguages(signal?: AbortSignal): Promise<Language[]> {
  return apiFetch("/languages", { signal });
}

export function fetchStories(language?: string, signal?: AbortSignal): Promise<StorySummary[]> {
  const query = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch(`/stories${query}`, { signal });
}

export function fetchStory(id: string, signal?: AbortSignal): Promise<Story> {
  return apiFetch(`/stories/${encodeURIComponent(id)}`, { signal });
}

/** URL of a story's narration (audio/wav), for an <audio> element's src. */
export function storyAudioUrl(id: string): string {
  return apiUrl(`/stories/${encodeURIComponent(id)}/audio`);
}
