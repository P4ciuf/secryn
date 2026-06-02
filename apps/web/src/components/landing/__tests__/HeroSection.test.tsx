import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HeroSection } from "@/components/landing/HeroSection";

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
    expect(screen.getByText(/SecureVault is the modern platform/)).toBeInTheDocument();
  });

  it("should render the Start Free Trial link", () => {
    renderWithRouter(<HeroSection />);
    const link = screen.getByRole("link", { name: "Start Free Trial" });
    expect(link).toBeInTheDocument();
  });

  it("should render the View Demo button", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByRole("button", { name: "View Demo" })).toBeInTheDocument();
  });
});
