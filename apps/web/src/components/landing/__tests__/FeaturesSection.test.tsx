import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

describe("<FeaturesSection />", () => {
  it("should render the section heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByRole("heading", { name: "Enterprise-Grade Features" })).toBeInTheDocument();
  });

  it("should render all four feature cards", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("AES-256 Encryption")).toBeInTheDocument();
    expect(screen.getByText("Access Control")).toBeInTheDocument();
    expect(screen.getByText("Developer-Friendly API")).toBeInTheDocument();
    expect(screen.getByText("Self-Hosted")).toBeInTheDocument();
  });

  it("should render feature descriptions", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Bank-level encryption for all stored secrets")).toBeInTheDocument();
  });
});
