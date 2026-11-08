import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { mockApi } from "@/test/fetch";
import { Library } from "./library";

afterEach(() => vi.unstubAllGlobals());

const languages = {
  body: [
    { code: "aka", name: "Twi (Akan)" },
    { code: "ewe", name: "Ewe" },
  ],
};
const twi = { id: "twi-greetings", title: "Twi greetings", language: "aka" };
const ewe = { id: "ewe-greetings", title: "Ewe greetings", language: "ewe" };

it("shows every story as a card linking to its player, with the tab bar", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [twi, ewe] } });
  render(<Library />);

  expect(screen.getByRole("status")).toHaveTextContent("Loading stories");
  const grid = await screen.findByRole("list", { name: "Stories" });
  const links = within(grid).getAllByRole("link");
  expect(links).toHaveLength(2);
  expect(links[0]).toHaveAttribute("href", "/stories/twi-greetings");
  expect(screen.getByRole("link", { name: /Library/ })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: /Saved/ })).toHaveAttribute("href", "/saved");
});

it("searches by title", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [twi, ewe] } });
  render(<Library />);
  await screen.findByRole("list", { name: "Stories" });

  await userEvent.type(screen.getByRole("searchbox"), "ewe");
  const grid = screen.getByRole("list", { name: "Stories" });
  expect(within(grid).getAllByRole("link")).toHaveLength(1);
  await userEvent.type(screen.getByRole("searchbox"), "zzz");
  expect(screen.getByText("No stories match your search.")).toBeInTheDocument();
});

it("filters by language with the segmented control", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [twi, ewe] } });
  render(<Library />);
  const group = await screen.findByRole("group", { name: "Language" });
  await userEvent.click(within(group).getByRole("button", { name: "Ewe" }));
  expect(within(group).getByRole("button", { name: "Ewe" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
