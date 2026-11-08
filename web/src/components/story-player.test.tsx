import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockApi } from "@/test/fetch";
import { StoryPlayer } from "./story-player";

beforeEach(() => window.localStorage.clear());
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

it("loads the story and points the player at its audio", async () => {
  mockApi(routes);
  render(<StoryPlayer id="twi-greetings" />);

  expect(screen.getByRole("status")).toHaveTextContent("Loading story");
  expect(await screen.findByRole("heading", { name: "Twi greetings" })).toBeInTheDocument();
  expect(screen.getByLabelText("Listen to Twi greetings")).toHaveAttribute(
    "src",
    "http://localhost:8000/api/v1/stories/twi-greetings/audio",
  );
  expect(screen.getByRole("link", { name: "← Library" })).toHaveAttribute("href", "/library");
});

it("listens by default and shows the words when the switch is turned on", async () => {
  mockApi(routes);
  render(<StoryPlayer id="twi-greetings" />);
  await screen.findByRole("heading", { name: "Twi greetings" });

  expect(screen.queryByText("Akwaaba. Wo ho te sɛn?")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("switch", { name: "Show the words" }));
  expect(screen.getByText("Akwaaba. Wo ho te sɛn?")).toBeInTheDocument();
});

it("saves the story with the heart, and links to the next story", async () => {
  mockApi(routes);
  render(<StoryPlayer id="twi-greetings" />);
  const heart = await screen.findByRole("button", { name: "Save this story" });
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

it("shows progress while audio is prepared, and an error if it fails", async () => {
  mockApi(routes);
  render(<StoryPlayer id="twi-greetings" />);
  const audio = await screen.findByLabelText("Listen to Twi greetings");

  fireEvent.play(audio);
  expect(screen.getByRole("status")).toHaveTextContent("Preparing the audio");
  fireEvent.playing(audio);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  fireEvent.error(audio);
  expect(screen.getByRole("alert")).toHaveTextContent("audio could not be played");
});

it("offers to try the audio again after it fails", async () => {
  mockApi(routes);
  render(<StoryPlayer id="twi-greetings" />);
  fireEvent.error(await screen.findByLabelText("Listen to Twi greetings"));
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Listen to Twi greetings")).toBeInTheDocument();
});

it("shows not found without a retry button", async () => {
  mockApi({});
  render(<StoryPlayer id="missing" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not find that story");
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "← Library" })).toHaveAttribute("href", "/library");
});
