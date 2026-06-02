import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import NotFound from "@/pages/NotFound";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("NotFound page", () => {
  it("should render the 404 heading", () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should render the 'Page not found' message", () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("should render the Go Home link", () => {
    renderWithRouter(<NotFound />);
    const link = screen.getByRole("link", { name: "Go Home" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
