import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockApi } from "@/test/fetch";
import { StoryPlayer } from "./story-player";

beforeEach(() => {
  window.localStorage.clear();
  // jsdom has no media engine: play() and pause() only need to be callable here.
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});
afterEach(() => vi.unstubAllGlobals());

const story = {
  id: "twi-greetings",
  title: "Twi greetings",
  language: "aka",
  text: "Akwaaba. Wo ho te sɛn?",
};
const ewe = { id: "ewe-greetings", title: "Ewe greetings", language: "ewe" };
const routes = {
  "/stories/twi-greetings": { body: story },
  "/stories": { body: [{ id: story.id, title: story.title, language: story.language }, ewe] },
  "/languages": { body: [{ code: "aka", name: "Twi (Akan)" }] },
};

async function renderPlayer() {
  mockApi(routes);
  render(<StoryPlayer id="twi-greetings" />);
  return (await screen.findByLabelText("Listen to Twi greetings")) as HTMLAudioElement;
}

/** Pretends the browser loaded the audio: it knows the length and whether it can seek. */
function loadAudio(audio: HTMLAudioElement, { duration = 20, canSeek = true, at = 0 } = {}) {
  Object.defineProperty(audio, "duration", { configurable: true, value: duration });
  Object.defineProperty(audio, "currentTime", { configurable: true, writable: true, value: at });
  Object.defineProperty(audio, "seekable", {
    configurable: true,
    value: { length: canSeek ? 1 : 0, start: () => 0, end: () => duration },
  });
  fireEvent.loadedMetadata(audio);
  fireEvent.timeUpdate(audio);
}

it("loads the story and points the player at its audio", async () => {
  mockApi(routes);
  render(<StoryPlayer id="twi-greetings" />);

  expect(screen.getByRole("status")).toHaveTextContent("Loading story");
  expect(await screen.findByRole("heading", { name: "Twi greetings" })).toBeInTheDocument();
  expect(screen.getByLabelText("Listen to Twi greetings")).toHaveAttribute(
    "src",
    "http://localhost:8000/api/v1/stories/twi-greetings/audio",
  );
  expect(screen.getByRole("link", { name: "Back to the library" })).toHaveAttribute(
    "href",
    "/library",
  );
});

it("marks the title and the words with the story's language, not the whole page", async () => {
  await renderPlayer();
  expect(screen.getByRole("heading", { name: "Twi greetings" })).toHaveAttribute("lang", "aka");
  expect(screen.getByRole("article")).not.toHaveAttribute("lang");
});

it("listens by default and shows the words when the switch is turned on", async () => {
  await renderPlayer();

  expect(screen.queryByText("Akwaaba. Wo ho te sɛn?")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("switch", { name: "Show the words" }));
  expect(screen.getByText("Akwaaba. Wo ho te sɛn?").closest("[lang]")).toHaveAttribute(
    "lang",
    "aka",
  );
});

it("shows the words one paragraph at a time", async () => {
  mockApi({
    ...routes,
    "/stories/twi-greetings": { body: { ...story, text: "Akwaaba.\n\nMedaase." } },
  });
  render(<StoryPlayer id="twi-greetings" />);
  await userEvent.click(await screen.findByRole("switch", { name: "Show the words" }));
  expect(screen.getByText("Akwaaba.").tagName).toBe("P");
  expect(screen.getByText("Medaase.").tagName).toBe("P");
});

it("saves the story with the heart, and links to the next story", async () => {
  await renderPlayer();
  const heart = screen.getByRole("button", { name: "Save this story" });
  await userEvent.click(heart);
  expect(screen.getByRole("button", { name: "Remove from saved" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await screen.findByRole("link", { name: /Next story/ })).toHaveAttribute(
    "href",
    "/stories/ewe-greetings",
  );
});

it("plays with the big button, which turns into pause and then play again", async () => {
  const audio = await renderPlayer();

  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(audio.play).toHaveBeenCalledOnce();

  fireEvent.play(audio);
  fireEvent.playing(audio);
  Object.defineProperty(audio, "paused", { configurable: true, value: false });
  await userEvent.click(screen.getByRole("button", { name: "Pause" }));
  expect(audio.pause).toHaveBeenCalledOnce();

  fireEvent.pause(audio);
  expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  fireEvent.ended(audio);
  expect(screen.getByRole("button", { name: "Play again" })).toBeInTheDocument();
});

it("shows how far the story is and skips 10 seconds back and forward", async () => {
  const audio = await renderPlayer();
  const back = screen.getByRole("button", { name: "Back 10 seconds" });
  const forward = screen.getByRole("button", { name: "Forward 10 seconds" });
  const bar = screen.getByRole("slider", { name: "Story progress" });
  expect(back).toBeDisabled();
  expect(forward).toBeDisabled();
  expect(bar).toBeDisabled();

  loadAudio(audio, { duration: 83, at: 5 });
  expect(screen.getByText("0:05")).toBeInTheDocument();
  expect(screen.getByText("1:23")).toBeInTheDocument();
  expect(bar).toHaveAttribute("aria-valuetext", "5 seconds of 1 minute 23 seconds");

  await userEvent.click(forward);
  expect(audio.currentTime).toBe(15);
  await userEvent.click(back);
  expect(audio.currentTime).toBe(5);
  await userEvent.click(back);
  expect(audio.currentTime).toBe(0);

  fireEvent.change(bar, { target: { value: "40" } });
  expect(audio.currentTime).toBe(40);
  fireEvent.change(bar, { target: { value: "500" } });
  expect(audio.currentTime).toBe(83);
});

it("keeps skipping switched off when the browser cannot seek in the audio", async () => {
  const audio = await renderPlayer();
  loadAudio(audio, { canSeek: false });
  expect(screen.getByRole("button", { name: "Back 10 seconds" })).toBeDisabled();
  expect(screen.getByRole("slider", { name: "Story progress" })).toBeDisabled();
  expect(screen.getByText("0:20")).toBeInTheDocument();
});

it("shows progress while audio is prepared, and an error if it fails", async () => {
  const audio = await renderPlayer();

  fireEvent.play(audio);
  expect(screen.getByRole("status")).toHaveTextContent("Preparing the audio");
  fireEvent.playing(audio);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  fireEvent.error(audio);
  expect(screen.getByRole("alert")).toHaveTextContent("audio could not be played");
});

it("offers to try the audio again after it fails", async () => {
  fireEvent.error(await renderPlayer());
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Listen to Twi greetings")).toBeInTheDocument();
});

it("shows not found without a retry button", async () => {
  mockApi({});
  render(<StoryPlayer id="missing" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not find that story");
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to the library" })).toHaveAttribute(
    "href",
    "/library",
  );
});
