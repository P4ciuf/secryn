import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingHeroSection from "../heroSection";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    register: "/register",
  },
}));

describe("LandingHeroSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the headline", () => {
    render(<LandingHeroSection />);

    expect(screen.getByRole("heading", { name: /secure your secrets/i })).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<LandingHeroSection />);

    expect(screen.getByText(/managing api keys, tokens, and credentials/i)).toBeInTheDocument();
  });

  it("renders a CTA link to the register page", () => {
    render(<LandingHeroSection />);

    const link = screen.getByRole("link", { name: /get started/i });
    expect(link).toHaveAttribute("href", "/register");
  });
});
