import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { COVER_PALETTES, COVER_SCENES } from "@/lib/home";
import { CoverArt } from "./cover-art";

it("draws a scene and a palette for any story id, hidden from screen readers", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const { container, unmount } = render(<CoverArt id={`story-${i}`} />);
    const cover = container.firstElementChild!;
    expect(cover).toHaveAttribute("aria-hidden", "true");
    expect(cover.querySelector("svg")!.childElementCount).toBeGreaterThan(2);
    const scene = COVER_SCENES.find((s) => cover.classList.contains(`cover-scene-${s}`));
    const palette = COVER_PALETTES.find((p) => cover.classList.contains(`cover-${p}`));
    expect(scene).toBeDefined();
    expect(palette).toBeDefined();
    seen.add(scene!);
    unmount();
  }
  // Sixty stories are plenty to meet every scene, so the library never looks like one picture.
  expect([...seen].sort()).toEqual([...COVER_SCENES].sort());
});

it("gives the same story the same cover every time", () => {
  const a = render(<CoverArt id="twi-greetings" />).container.innerHTML;
  const b = render(<CoverArt id="twi-greetings" />).container.innerHTML;
  expect(a).toBe(b);
});
