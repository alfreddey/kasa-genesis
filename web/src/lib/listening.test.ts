import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import {
  heardFraction,
  inProgress,
  markFinished,
  readListening,
  saveProgress,
  starCount,
  useListening,
} from "./listening";

beforeEach(() => window.localStorage.clear());

it("remembers where a story was stopped, with its length", () => {
  saveProgress("twi-greetings", 42.26, 83, 1000);
  expect(readListening("twi-greetings")).toEqual({
    position: 42.3,
    duration: 83,
    finished: false,
    updatedAt: 1000,
  });
  expect(heardFraction(readListening("twi-greetings"))).toBeCloseTo(0.51, 2);
  expect(heardFraction(undefined)).toBe(0);
});

it("does not keep a place in the first or last few seconds", () => {
  saveProgress("a", 3, 83);
  expect(readListening("a")).toBeUndefined();
  saveProgress("a", 40, 83);
  saveProgress("a", 80, 83);
  expect(readListening("a")).toBeUndefined();
});

it("ignores times the browser does not know yet", () => {
  saveProgress("a", 40, Number.NaN);
  saveProgress("a", Number.NaN, 83);
  saveProgress("a", 40, 0);
  expect(readListening("a")).toBeUndefined();
});

it("keeps the star when a finished story is started again, and drops only the place", () => {
  saveProgress("a", 40, 83, 1);
  markFinished("a", 83, 2);
  expect(readListening("a")).toEqual({ position: 0, duration: 83, finished: true, updatedAt: 2 });

  saveProgress("a", 30, 83, 3);
  expect(readListening("a")).toMatchObject({ position: 30, finished: true });
  saveProgress("a", 0, 83, 4);
  expect(readListening("a")).toMatchObject({ position: 0, finished: true });
});

it("lists the stories stopped halfway, the most recent first, and counts the stars", () => {
  saveProgress("old", 20, 60, 1);
  saveProgress("new", 30, 60, 5);
  markFinished("done", 60, 9);
  const { result } = renderHook(() => useListening());
  expect(inProgress(result.current)).toEqual(["new", "old"]);
  expect(starCount(result.current)).toBe(1);

  act(() => markFinished("new", 60, 10));
  expect(inProgress(result.current)).toEqual(["old"]);
  expect(starCount(result.current)).toBe(2);
});

it("reads broken or foreign stored values as nothing", () => {
  window.localStorage.setItem("kasa:listening", "not json");
  expect(readListening("a")).toBeUndefined();
  window.localStorage.setItem(
    "kasa:listening",
    JSON.stringify({
      a: { position: "9", duration: 60, finished: false, updatedAt: 1 },
      b: { position: 9, duration: 60, finished: false, updatedAt: 1 },
      c: null,
    }),
  );
  expect(readListening("a")).toBeUndefined();
  expect(readListening("c")).toBeUndefined();
  expect(readListening("b")).toMatchObject({ position: 9 });
  window.localStorage.setItem("kasa:listening", "[1, 2]");
  expect(readListening("b")).toBeUndefined();
});
