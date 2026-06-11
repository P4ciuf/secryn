import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhySection } from "@/components/landing/WhySection";

describe("<WhySection />", () => {
  it("should render the heading", () => {
    render(<WhySection />);
    expect(screen.getByRole("heading", { name: "Why Secryn?" })).toBeInTheDocument();
  });

  it("should render all three reasons", () => {
    render(<WhySection />);
    expect(screen.getByText("Military-Grade Security")).toBeInTheDocument();
    expect(screen.getByText("Self-Hosted Control")).toBeInTheDocument();
    expect(screen.getByText("Team Collaboration")).toBeInTheDocument();
  });

  it("should render reason descriptions", () => {
    render(<WhySection />);
    expect(screen.getByText(/All secrets encrypted with AES-256 encryption/)).toBeInTheDocument();
  });
});
