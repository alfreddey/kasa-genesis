import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { mockApi } from "@/test/fetch";
import { StoryPlayer } from "./story-player";

afterEach(() => vi.unstubAllGlobals());

const story = {
  id: "twi-greetings",
  title: "Twi greetings",
  language: "aka",
  text: "Akwaaba. Wo ho te sɛn?",
};

it("loads the story and points the player at its audio", async () => {
  mockApi({ "/stories/twi-greetings": { body: story } });
  render(<StoryPlayer id="twi-greetings" />);

  expect(screen.getByRole("status")).toHaveTextContent("Loading story");
  expect(await screen.findByRole("heading", { name: "Twi greetings" })).toBeInTheDocument();
  expect(screen.getByText("Akwaaba. Wo ho te sɛn?")).toBeInTheDocument();
  expect(screen.getByLabelText("Listen to Twi greetings")).toHaveAttribute(
    "src",
    "http://localhost:8000/api/v1/stories/twi-greetings/audio",
  );
});

it("shows progress while audio is prepared, and an error if it fails", async () => {
  mockApi({ "/stories/twi-greetings": { body: story } });
  render(<StoryPlayer id="twi-greetings" />);
  const audio = await screen.findByLabelText("Listen to Twi greetings");

  fireEvent.play(audio);
  expect(screen.getByRole("status")).toHaveTextContent("Preparing the audio");
  fireEvent.playing(audio);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  fireEvent.error(audio);
  expect(screen.getByRole("alert")).toHaveTextContent("audio could not be played");
});

it("shows not found without a retry button", async () => {
  mockApi({});
  render(<StoryPlayer id="missing" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not find that story");
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /All stories/ })).toHaveAttribute("href", "/");
});
