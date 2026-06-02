import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingFooter } from "@/components/landing/Footer";

describe("<LandingFooter />", () => {
  it("should render the copyright text", () => {
    render(<LandingFooter />);
    expect(screen.getByText(/2026 SecureVault. Built with security in mind./)).toBeInTheDocument();
  });

  it("should render a footer element", () => {
    render(<LandingFooter />);
    const footer = document.querySelector("footer");
    expect(footer).toBeInTheDocument();
  });
});
