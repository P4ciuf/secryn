import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockRoutes } = vi.hoisted(() => ({
  mockRoutes: {
    landing: "/",
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    dashboard: { path: "/dashboard", children: {} },
  },
}));

vi.mock("@/data/routes", () => ({
  ROUTES: mockRoutes,
}));

vi.mock("@/data/landing", () => ({
  features: [
    {
      icon: vi.fn(() => null),
      title: "AES-256 Encryption",
      description: "Bank-level encryption",
    },
  ],
  steps: [
    {
      number: 1,
      title: "Create Projects",
      description: "Organize your secrets",
    },
  ],
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => (
      <div {...props}>{children as React.ReactNode}</div>
    ),
  },
}));

vi.mock("@/components/landing/heroSection", () => ({
  default: () => <section data-testid="hero-section">Hero Section</section>,
}));

vi.mock("@/components/landing/whySection", () => ({
  default: () => <section data-testid="why-section">Why Section</section>,
}));

import Landing, { metadata } from "../page";

describe("Landing page (/)", () => {
  it("renders the navigation bar with Secryn branding and links", () => {
    render(<Landing />);

    expect(screen.getByText("Secryn")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute("href", "/register");
  });

  it("renders the hero section", () => {
    render(<Landing />);

    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
  });

  it("renders the 'Why Secryn?' section", () => {
    render(<Landing />);

    expect(screen.getByTestId("why-section")).toBeInTheDocument();
  });

  it("renders the 'How It Works' section with steps", () => {
    render(<Landing />);

    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Create Projects")).toBeInTheDocument();
    expect(screen.getByText("Organize your secrets")).toBeInTheDocument();
  });

  it("renders the 'Enterprise-Grade Features' section", () => {
    render(<Landing />);

    expect(screen.getByText("Enterprise-Grade Features")).toBeInTheDocument();
    expect(screen.getByText("AES-256 Encryption")).toBeInTheDocument();
  });

  it("renders the CTA section with register link", () => {
    render(<Landing />);

    expect(screen.getByText("Ready to Secure Your Secrets?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get Started Now" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("renders the footer with author credit", () => {
    render(<Landing />);

    const link = screen.getByRole("link", { name: "P4ciuf" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://github.com/p4ciuf");
  });

  it("exports metadata with correct canonical and OpenGraph values", () => {
    expect(metadata).toBeDefined();
    expect(metadata.alternates).toEqual({ canonical: "/" });
    expect(metadata.openGraph).toEqual({
      title: "Secryn - Secure Secrets Management Platform",
      description:
        "Secryn is a self-hosted secrets management platform for teams. Store, share, and manage API keys, tokens, and credentials with AES-256 encryption.",
      url: "https://secryn.xyz",
      type: "website",
    });
  });
});
