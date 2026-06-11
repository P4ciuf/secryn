import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LandingNavbar } from "@/components/landing/Navbar";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<LandingNavbar />", () => {
  it("should render the Secryn brand name", () => {
    renderWithRouter(<LandingNavbar />);
    expect(screen.getByText("Secryn")).toBeInTheDocument();
  });

  it("should render the Login link", () => {
    renderWithRouter(<LandingNavbar />);
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  });

  it("should render the Get Started link", () => {
    renderWithRouter(<LandingNavbar />);
    expect(screen.getByRole("link", { name: "Get Started" })).toBeInTheDocument();
  });

  it("should render a nav element", () => {
    renderWithRouter(<LandingNavbar />);
    const nav = document.querySelector("nav");
    expect(nav).toBeInTheDocument();
  });
});
