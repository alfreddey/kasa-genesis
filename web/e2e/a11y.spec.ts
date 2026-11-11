import { expect, expectAccessible, test } from "./fixtures";

// Every main screen, in light and dark, with colour contrast checked (design handoff #115).
const screens: {
  name: string;
  path: string;
  ready: (page: import("@playwright/test").Page) => Promise<void>;
}[] = [
  {
    name: "Home",
    path: "/",
    ready: (page) => expect(page.getByRole("navigation", { name: "Main" })).toBeVisible(),
  },
  {
    name: "Library",
    path: "/library",
    ready: (page) => expect(page.getByRole("heading", { name: "Library" })).toBeVisible(),
  },
  {
    name: "Saved",
    path: "/saved",
    ready: (page) => expect(page.getByRole("heading", { name: "Saved" })).toBeVisible(),
  },
  {
    name: "Parents",
    path: "/parents",
    ready: (page) => expect(page.getByRole("heading", { name: "Parents" })).toBeVisible(),
  },
  {
    name: "Not found",
    path: "/no-such-page",
    ready: (page) => expect(page.getByRole("link", { name: "Back to all stories" })).toBeVisible(),
  },
  {
    name: "Player",
    path: "/stories/twi-greetings",
    ready: (page) => expect(page.getByRole("heading", { name: "Twi greetings" })).toBeVisible(),
  },
  {
    name: "Player with the words shown",
    path: "/stories/twi-greetings",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Twi greetings" })).toBeVisible();
      await page.getByRole("switch", { name: /words/i }).click();
      await expect(page.getByText("Akwaaba. Wo ho te sɛn?")).toBeVisible();
    },
  },
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });
    for (const screen of screens) {
      test(`${screen.name} has no serious accessibility problems`, async ({ page }) => {
        await page.goto(screen.path);
        await screen.ready(page);
        await expectAccessible(page);
      });
    }
  });
}
