import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

describe("<HowItWorksSection />", () => {
  it("should render the heading", () => {
    render(<HowItWorksSection />);
    expect(screen.getByRole("heading", { name: "How It Works" })).toBeInTheDocument();
  });

  it("should render all three steps", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("Create Projects")).toBeInTheDocument();
    expect(screen.getByText("Store Secrets Securely")).toBeInTheDocument();
    expect(screen.getByText("Access Anywhere")).toBeInTheDocument();
  });

  it("should render step numbers", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
