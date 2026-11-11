import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

export const stories = [
  { id: "twi-greetings", title: "Twi greetings", language: "aka", text: "Akwaaba. Wo ho te sɛn?" },
  { id: "ewe-greetings", title: "Ewe greetings", language: "ewe", text: "Woezɔ. Akpe." },
];
const languages = [
  { code: "aka", name: "Twi (Akan)" },
  { code: "ewe", name: "Ewe" },
];

/** Answers every /api/v1 call from the browser with fixed data, so no real API is needed. */
export async function stubApi(page: Page, opts: { down?: boolean } = {}) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/v1/, "");
    if (opts.down) return route.abort("connectionrefused");
    if (path === "/languages") return route.fulfill({ json: languages });
    if (path === "/stories") {
      const lang = url.searchParams.get("language");
      const list = stories.filter((s) => !lang || s.language === lang);
      return route.fulfill({
        json: list.map(({ id, title, language }) => ({ id, title, language })),
      });
    }
    const audio = path.match(/^\/stories\/([^/]+)\/audio$/);
    if (audio) return route.fulfill({ status: 200, contentType: "audio/wav", body: "" });
    const one = path.match(/^\/stories\/([^/]+)$/);
    const story = one && stories.find((s) => s.id === one[1]);
    if (story) return route.fulfill({ json: story });
    return route.fulfill({ status: 404, json: { detail: "Story not found" } });
  });
}

/**
 * Fails the test when axe finds serious or critical accessibility problems on the page,
 * colour contrast included (#45, design handoff #115). Run it in light and dark.
 */
export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join("; ")})`),
  ).toEqual([]);
}

export const test = base.extend<{ api: void }>({
  api: [
    async ({ page }, use) => {
      await stubApi(page);
      await use();
    },
    { auto: true },
  ],
});
export { expect };
