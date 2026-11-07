import { act, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { OfflineBanner } from "./offline-banner";

it("shows a banner when the connection drops and hides it when it returns", () => {
  render(<OfflineBanner />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();

  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
  expect(screen.getByRole("status")).toHaveTextContent("You are offline");

  act(() => {
    window.dispatchEvent(new Event("online"));
  });
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
