import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CTASection } from "@/components/landing/CTASection";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<CTASection />", () => {
  it("should render the heading", () => {
    renderWithRouter(<CTASection />);
    expect(
      screen.getByRole("heading", { name: "Ready to Secure Your Secrets?" }),
    ).toBeInTheDocument();
  });

  it("should render the subtitle", () => {
    renderWithRouter(<CTASection />);
    expect(screen.getByText(/Join thousands of developers/)).toBeInTheDocument();
  });

  it("should render the Get Started Now link", () => {
    renderWithRouter(<CTASection />);
    const link = screen.getByRole("link", { name: "Get Started Now" });
    expect(link).toBeInTheDocument();
  });
});
