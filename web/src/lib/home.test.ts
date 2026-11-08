import { expect, it } from "vitest";
import { COVER_PALETTES, coverPalette, shortLanguageName, storyOfTheDay } from "./home";

const story = (id: string) => ({ id, title: id, language: "aka" });

it("gives the same cover palette to the same story, always one of the four", () => {
  expect(coverPalette("twi-greetings")).toBe(coverPalette("twi-greetings"));
  for (const id of ["a", "twi-greetings", "ewe-greetings", "x".repeat(40)]) {
    expect(COVER_PALETTES).toContain(coverPalette(id));
  }
});

it("picks one story per day and rotates through the list", () => {
  const stories = [story("a"), story("b"), story("c")];
  const day1 = storyOfTheDay(stories, new Date(2026, 10, 8, 9));
  expect(storyOfTheDay(stories, new Date(2026, 10, 8, 21))).toBe(day1);
  const day2 = storyOfTheDay(stories, new Date(2026, 10, 9, 9));
  expect(day2).not.toBe(day1);
  expect(storyOfTheDay([], new Date())).toBeNull();
});

it("shortens language names for the small tiles", () => {
  expect(shortLanguageName("Twi (Akan)")).toBe("Twi");
  expect(shortLanguageName("Ewe")).toBe("Ewe");
});
