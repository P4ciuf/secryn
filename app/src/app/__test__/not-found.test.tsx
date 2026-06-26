import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "../not-found";

describe("NotFound", () => {
  it("renders the 404 heading", () => {
    render(<NotFound />);

    expect(screen.getByText("404 | Page not found")).toBeInTheDocument();
  });

  it("renders a link back to the home page", () => {
    render(<NotFound />);

    const link = screen.getByRole("link", { name: "Go to home page" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
