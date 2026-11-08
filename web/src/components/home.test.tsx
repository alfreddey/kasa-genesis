import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { mockApi } from "@/test/fetch";
import { Home } from "./home";

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

it("marks Home as the current tab and leaves unfinished tabs inert", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [twi] } });
  render(<Home />);

  const nav = screen.getByRole("navigation", { name: "Main" });
  expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  expect(within(nav).getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
  expect(within(nav).getByRole("button", { name: "Saved" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
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
