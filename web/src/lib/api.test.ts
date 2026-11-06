import { afterEach, describe, expect, it, vi } from "vitest";
import { mockApi } from "@/test/fetch";
import { ApiError, apiUrl, fetchStories, fetchStory, storyAudioUrl } from "./api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("apiUrl", () => {
  it("defaults to the local API", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(apiUrl("/stories")).toBe("http://localhost:8000/api/v1/stories");
  });

  it("uses NEXT_PUBLIC_API_URL and drops a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/");
    expect(apiUrl("/stories")).toBe("https://api.example.com/api/v1/stories");
    expect(storyAudioUrl("twi greetings")).toBe(
      "https://api.example.com/api/v1/stories/twi%20greetings/audio",
    );
  });
});

describe("apiFetch", () => {
  it("passes the language filter", async () => {
    const fetch = mockApi({ "/stories?language=aka": { body: [] } });
    await fetchStories("aka");
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "http://localhost:8000/api/v1/stories?language=aka",
    );
  });

  it("turns {detail} errors into ApiError with the status", async () => {
    mockApi({ "/stories/nope": { status: 404, body: { detail: "Story not found" } } });
    await expect(fetchStory("nope")).rejects.toEqual(new ApiError("Story not found", 404));
  });

  it("reports an unreachable server with status 0", async () => {
    mockApi({ "/stories": { throws: new TypeError("Failed to fetch") } });
    const err = await fetchStories().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);
    expect((err as ApiError).message).toBe("Could not reach the server.");
  });

  it("reports a slow server as a timeout", async () => {
    mockApi({ "/stories": { throws: new DOMException("timed out", "TimeoutError") } });
    await expect(fetchStories()).rejects.toThrow("taking too long");
  });
});
