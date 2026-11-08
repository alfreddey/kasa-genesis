import { afterEach, describe as suite, expect, it, vi } from "vitest";
import { describe, getStories, getStory, siteUrl, storyJsonLd } from "./seo";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

suite("siteUrl", () => {
  it("defaults to localhost and trims trailing slashes", () => {
    vi.stubEnv("SITE_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
    vi.stubEnv("SITE_URL", "https://kasa.example/");
    expect(siteUrl()).toBe("https://kasa.example");
  });
});

suite("describe", () => {
  it("collapses whitespace and truncates long text", () => {
    expect(describe("a  b\n c")).toBe("a b c");
    const out = describe("x".repeat(300), 50);
    expect(out).toHaveLength(50);
    expect(out.endsWith("…")).toBe(true);
  });
});

suite("storyJsonLd", () => {
  it("names the language and canonical url", () => {
    const ld = storyJsonLd({ id: "a b", title: "T", language: "aka", text: "Hi" });
    expect(ld).toMatchObject({
      "@type": "CreativeWork",
      inLanguage: "aka",
      url: "http://localhost:3000/stories/a%20b",
    });
  });
});

suite("server API reader", () => {
  it("returns null or empty instead of throwing when the API is unreachable", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api:8000");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await getStory("x")).toBeNull();
    expect(await getStories()).toEqual([]);
  });

  it("does not call a relative public API url from the server", async () => {
    vi.stubEnv("API_INTERNAL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "/");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await getStory("x")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads a story from the internal API url", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api:8000/");
    const story = { id: "x", title: "X", language: "aka", text: "t" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(story)));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getStory("x")).toEqual(story);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api:8000/api/v1/stories/x");
  });
});
