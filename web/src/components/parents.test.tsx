import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Parents } from "./parents";

it("says it is coming soon and links back to the library", () => {
  render(<Parents />);
  expect(screen.getByRole("heading", { name: "Parents" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse the library" })).toHaveAttribute(
    "href",
    "/library",
  );
});
