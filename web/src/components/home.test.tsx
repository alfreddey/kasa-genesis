import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockApi } from "@/test/fetch";
import { Home } from "./home";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

const languages = {
  body: [
    { code: "aka", name: "Twi (Akan)" },
    { code: "ewe", name: "Ewe" },
  ],
};
const twi = { id: "twi-greetings", title: "Twi greetings", language: "aka" };
const ewe = { id: "ewe-greetings", title: "Ewe greetings", language: "ewe" };

it("shows the greeting, a loading state, then the story of the day linking to the player", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [twi] } });
  render(<Home />);

  expect(screen.getByRole("heading", { name: "Akwaaba!" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Loading stories");
  const link = await screen.findByRole("link", { name: /Story of the day.*Twi greetings/ });
  expect(link).toHaveAttribute("href", "/stories/twi-greetings");
});

it("lists the other stories on a shelf and links See all to the library", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [twi, ewe] } });
  render(<Home />);

  const shelf = await screen.findByRole("list", { name: "New stories" });
  expect(within(shelf).getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/library");
});

it("filters by language with the tiles", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [twi, ewe] } });
  render(<Home />);

  const group = await screen.findByRole("group", { name: "Language" });
  expect(within(group).getByRole("button", { name: "All" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await userEvent.click(within(group).getByRole("button", { name: "Ewe" }));
  expect(within(group).getByRole("button", { name: "Ewe" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  expect(screen.getByRole("link", { name: /Story of the day.*Ewe greetings/ })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Twi greetings/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "New stories" })).not.toBeInTheDocument();
});

it("marks Home as the current tab and links every tab to its page", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [twi] } });
  render(<Home />);

  const nav = screen.getByRole("navigation", { name: "Main" });
  expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  expect(within(nav).getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
  expect(within(nav).getByRole("link", { name: "Saved" })).toHaveAttribute("href", "/saved");
  expect(within(nav).getByRole("link", { name: "Parents" })).toHaveAttribute("href", "/parents");
  await screen.findByRole("link", { name: /Twi greetings/ });
});

it("shows an error when the API is down, and retries", async () => {
  mockApi({ "/stories": { throws: new TypeError("Failed to fetch") } });
  render(<Home />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server.");

  mockApi({ "/languages": languages, "/stories": { body: [twi] } });
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("link", { name: /Twi greetings/ })).toBeInTheDocument();
});

it("says so when there are no stories", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [] } });
  render(<Home />);
  expect(await screen.findByText("No stories yet.")).toBeInTheDocument();
});

it("offers the story the child stopped halfway, with how much is left", async () => {
  window.localStorage.setItem(
    "kasa:listening",
    JSON.stringify({
      "ewe-greetings": { position: 30, duration: 200, finished: false, updatedAt: 2 },
      "gone-story": { position: 30, duration: 200, finished: false, updatedAt: 9 },
    }),
  );
  mockApi({ "/languages": languages, "/stories": { body: [twi, ewe] } });
  render(<Home />);

  const link = await screen.findByRole("link", { name: /Keep listening.*Ewe greetings/ });
  expect(link).toHaveAttribute("href", "/stories/ewe-greetings");
  expect(link).toHaveTextContent("3 minutes left");
  expect(screen.queryByText(/heard$/)).not.toBeInTheDocument();

  // It follows the language tiles like every other story.
  await userEvent.click(screen.getByRole("button", { name: "Twi" }));
  expect(screen.queryByRole("link", { name: /Keep listening/ })).not.toBeInTheDocument();
});

it("counts a star for every story heard to the end and marks those stories", async () => {
  window.localStorage.setItem(
    "kasa:listening",
    JSON.stringify({
      "ewe-greetings": { position: 0, duration: 9, finished: true, updatedAt: 2 },
    }),
  );
  mockApi({ "/languages": languages, "/stories": { body: [twi, ewe] } });
  render(<Home />);

  expect(await screen.findByText(/story heard/)).toHaveTextContent("1 story heard");
  const shelf = await screen.findByRole("list", { name: "New stories" });
  expect(within(shelf).getByRole("link")).toHaveTextContent("Heard to the end.");
  expect(screen.queryByRole("link", { name: /Keep listening/ })).not.toBeInTheDocument();
});
