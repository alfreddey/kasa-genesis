import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockApi } from "@/test/fetch";
import { Saved } from "./saved";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

const twi = { id: "twi-greetings", title: "Twi greetings", language: "aka" };
const ewe = { id: "ewe-greetings", title: "Ewe greetings", language: "ewe" };
const routes = { "/languages": { body: [] }, "/stories": { body: [twi, ewe] } };

it("points to the library when nothing is saved", async () => {
  mockApi(routes);
  render(<Saved />);
  expect(await screen.findByText(/No saved stories yet/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse the library" })).toHaveAttribute(
    "href",
    "/library",
  );
});

it("lists only the saved stories", async () => {
  window.localStorage.setItem("kasa:saved-stories", JSON.stringify(["ewe-greetings"]));
  mockApi(routes);
  render(<Saved />);
  const grid = await screen.findByRole("list", { name: "Saved stories" });
  const links = within(grid).getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAttribute("href", "/stories/ewe-greetings");
});
