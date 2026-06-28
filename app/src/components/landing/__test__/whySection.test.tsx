import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingwhySection from "../whySection";

const { mockReasons } = vi.hoisted(() => ({
  mockReasons: [
    {
      icon: ({ className }: { className?: string }) => (
        <span data-testid="mock-icon" className={className} />
      ),
      color: "text-blue-400",
      title: "Mock Feature",
      description: "A mock reason for testing",
      delay: 0.1,
    },
  ],
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/data/landing", () => ({
  reasons: mockReasons,
}));

describe("LandingwhySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the section heading", () => {
    render(<LandingwhySection />);

    expect(screen.getByRole("heading", { name: /why secryn\?/i })).toBeInTheDocument();
  });

  it("renders each reason card with title and description", () => {
    render(<LandingwhySection />);

    expect(screen.getByText("Mock Feature")).toBeInTheDocument();
    expect(screen.getByText("A mock reason for testing")).toBeInTheDocument();
  });
});
