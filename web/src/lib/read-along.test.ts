import { expect, it } from "vitest";
import type { AudioManifest } from "./api";
import { layOut, sentenceAt } from "./read-along";

function manifestOf(durations: number[], pause = 0.5): AudioManifest {
  return {
    story_id: "s",
    pause_seconds: pause,
    sentences: durations.map((d, index) => ({
      index,
      text: `S${index}`,
      url: `/api/v1/audio/${index}`,
      duration_seconds: d,
    })),
  } as AudioManifest;
}

it("lays the sentences over the text and keeps what is between them", () => {
  expect(layOut("Akwaaba.\n\nMedaase.", ["Akwaaba.", "Medaase."])).toEqual([
    { text: "Akwaaba.", index: 0 },
    { text: "\n\n", index: null },
    { text: "Medaase.", index: 1 },
  ]);
});

it("keeps text before and after the sentences", () => {
  expect(layOut("  Hi. Bye. ", ["Hi.", "Bye."])).toEqual([
    { text: "  ", index: null },
    { text: "Hi.", index: 0 },
    { text: " ", index: null },
    { text: "Bye.", index: 1 },
    { text: " ", index: null },
  ]);
});

it("gives up when a sentence is not in the text", () => {
  expect(layOut("Akwaaba.", ["Akwaaba.", "Medaase."])).toBeNull();
});

it("finds the sentence at a time, counting the pause as part of the sentence before", () => {
  const m = manifestOf([2, 3]);
  expect(sentenceAt(m, 0)).toBe(0);
  expect(sentenceAt(m, 2.4)).toBe(0);
  expect(sentenceAt(m, 2.5)).toBe(1);
  expect(sentenceAt(m, 5.9)).toBe(1);
  expect(sentenceAt(m, 99)).toBe(1);
  expect(sentenceAt(manifestOf([]), 3)).toBe(0);
});
