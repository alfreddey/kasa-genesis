import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { Parents } from "./parents";

beforeEach(() => window.localStorage.clear());

it("says it is coming soon and links back to the library", () => {
  render(<Parents />);
  expect(screen.getByRole("heading", { name: "Parents" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse the library" })).toHaveAttribute(
    "href",
    "/library",
  );
});

it("says what is remembered on this device, and that it stays there", () => {
  render(<Parents />);
  const note = screen.getByRole("region", { name: "On this device" });
  expect(note).toHaveTextContent("stays on this device");
  expect(within(note).getByRole("status")).toHaveTextContent("Nothing is remembered yet.");
  expect(screen.queryByRole("button", { name: /Forget/ })).not.toBeInTheDocument();
});

it("forgets the stars and places only after asking again", async () => {
  window.localStorage.setItem(
    "kasa:listening",
    JSON.stringify({
      a: { position: 0, duration: 60, finished: true, updatedAt: 1 },
      b: { position: 0, duration: 60, finished: true, updatedAt: 2 },
      c: { position: 20, duration: 60, finished: false, updatedAt: 3 },
    }),
  );
  render(<Parents />);
  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("Remembered now: 2 stars and 1 story stopped halfway.");

  await userEvent.click(screen.getByRole("button", { name: "Forget stars and places" }));
  await userEvent.click(screen.getByRole("button", { name: "No, keep them" }));
  expect(window.localStorage.getItem("kasa:listening")).toContain('"c"');

  await userEvent.click(screen.getByRole("button", { name: "Forget stars and places" }));
  await userEvent.click(screen.getByRole("button", { name: "Yes, forget them" }));
  expect(status).toHaveTextContent("Nothing is remembered yet.");
  expect(window.localStorage.getItem("kasa:listening")).toBe("{}");
  expect(screen.queryByRole("button", { name: /forget/i })).not.toBeInTheDocument();
});
