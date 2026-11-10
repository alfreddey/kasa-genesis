import { expect, expectAccessible, stubApi, test } from "./fixtures";

test("find a story in the library, filter by language and open it", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Twi greetings/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Ewe greetings/ }).first()).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "Ewe" }).click();
  await expect(page.getByRole("link", { name: /Twi greetings/ })).toHaveCount(0);

  await page
    .getByRole("link", { name: /Ewe greetings/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/stories\/ewe-greetings$/);
  await expect(page.getByRole("heading", { name: "Ewe greetings" })).toBeVisible();
});

test("the story page has an audio player pointed at the story's audio", async ({ page }) => {
  await page.goto("/stories/twi-greetings");
  await expect(page.getByRole("heading", { name: "Twi greetings" })).toBeVisible();
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    /\/api\/v1\/stories\/twi-greetings\/audio$/,
  );
  await expectAccessible(page);
});

test("a missing story shows a friendly message with a way back", async ({ page }) => {
  await page.goto("/stories/nope");
  await expect(page.locator(".status-error")).toContainText("could not find that story");
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Library/ }).first()).toBeVisible();
});

test("when the API is down the library says so and offers to retry", async ({ page }) => {
  await stubApi(page, { down: true });
  await page.goto("/library");
  await expect(page.locator(".status-error")).toContainText("Could not reach the server");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("the home page has no serious accessibility problems", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expectAccessible(page);
});
