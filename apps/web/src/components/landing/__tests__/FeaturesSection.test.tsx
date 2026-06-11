import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesSection } from "../FeaturesSection";

describe("<FeaturesSection />", () => {
  it("should render the section heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Enterprise-Grade Features")).toBeInTheDocument();
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
    expect(screen.getByText("Role-based permissions and audit logging")).toBeInTheDocument();
  });

  it("should render a grid layout with two columns on medium screens", () => {
    const { container } = render(<FeaturesSection />);
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid?.classList.contains("md:grid-cols-2")).toBe(true);
  });

  it("should render four cards total", () => {
    const { container } = render(<FeaturesSection />);
    const cards = container.querySelectorAll(".flex.gap-4.items-start");
    expect(cards).toHaveLength(4);
  });
});
