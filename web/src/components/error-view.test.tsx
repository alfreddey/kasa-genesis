import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ErrorView } from "./error-view";

it("offers a way to try again and to go back, without technical details", async () => {
  const reset = vi.fn();
  render(<ErrorView reset={reset} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(reset).toHaveBeenCalledOnce();
  expect(screen.getByRole("link", { name: /all stories/i })).toHaveAttribute("href", "/");
});
