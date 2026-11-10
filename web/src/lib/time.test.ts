import { expect, it } from "vitest";
import { formatTime, spokenTime } from "./time";

it("writes seconds as a clock", () => {
  expect(formatTime(0)).toBe("0:00");
  expect(formatTime(5.9)).toBe("0:05");
  expect(formatTime(83)).toBe("1:23");
  expect(formatTime(600)).toBe("10:00");
});

it("reads unknown or broken times as zero", () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -3]) {
    expect(formatTime(bad)).toBe("0:00");
    expect(spokenTime(bad)).toBe("0 seconds");
  }
});

it("says the time in words for screen readers", () => {
  expect(spokenTime(0)).toBe("0 seconds");
  expect(spokenTime(1)).toBe("1 second");
  expect(spokenTime(60)).toBe("1 minute");
  expect(spokenTime(83)).toBe("1 minute 23 seconds");
  expect(spokenTime(121)).toBe("2 minutes 1 second");
});
