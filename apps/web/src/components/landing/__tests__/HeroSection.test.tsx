import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HeroSection } from "../HeroSection";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<HeroSection />", () => {
  it("should render the main heading", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText("Secure Your Secrets, Simplify Your Workflow")).toBeInTheDocument();
  });

  it("should render the subtitle text", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText(/modern platform for managing API keys/)).toBeInTheDocument();
  });

  it("should render the Start Free Trial link pointing to register", () => {
    renderWithRouter(<HeroSection />);
    const link = screen.getByText("Start Free Trial");
    expect(link.closest("a")).toHaveAttribute("href", "/register");
  });

  it("should render the View Demo button", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText("View Demo")).toBeInTheDocument();
  });

  it("should render a gradient-text heading", () => {
    const { container } = renderWithRouter(<HeroSection />);
    const heading = container.querySelector("h1");
    expect(heading?.classList.contains("bg-clip-text")).toBe(true);
  });
});
