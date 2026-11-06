import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { mockApi } from "@/test/fetch";
import { StoryList } from "./story-list";

afterEach(() => vi.unstubAllGlobals());

const languages = {
  body: [
    { code: "aka", name: "Twi (Akan)" },
    { code: "ewe", name: "Ewe" },
  ],
};
const twi = { id: "twi-greetings", title: "Twi greetings", language: "aka" };
const ewe = { id: "ewe-greetings", title: "Ewe greetings", language: "ewe" };

it("shows a loading state, then the stories with links", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [twi, ewe] } });
  render(<StoryList />);

  expect(screen.getByRole("status")).toHaveTextContent("Loading stories");
  const link = await screen.findByRole("link", { name: "Twi greetings" });
  expect(link).toHaveAttribute("href", "/stories/twi-greetings");
  expect(link.parentElement).toHaveTextContent("Twi (Akan)");
});

it("filters by language", async () => {
  mockApi({
    "/languages": languages,
    "/stories": { body: [twi, ewe] },
    "/stories?language=ewe": { body: [ewe] },
  });
  render(<StoryList />);

  await userEvent.selectOptions(await screen.findByLabelText("Language"), "ewe");
  await screen.findByRole("link", { name: "Ewe greetings" });
  expect(screen.queryByRole("link", { name: "Twi greetings" })).not.toBeInTheDocument();
});

it("shows an error when the API is down, and retries", async () => {
  const fetch = mockApi({ "/stories": { throws: new TypeError("Failed to fetch") } });
  render(<StoryList />);

  expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server.");

  mockApi({ "/languages": languages, "/stories": { body: [twi] } });
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("link", { name: "Twi greetings" })).toBeInTheDocument();
  expect(fetch).toHaveBeenCalled();
});

it("says so when there are no stories", async () => {
  mockApi({ "/languages": languages, "/stories": { body: [] } });
  render(<StoryList />);
  expect(await screen.findByText("No stories yet.")).toBeInTheDocument();
});
