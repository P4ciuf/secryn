import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Landing from "@/pages/Landing";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Landing", () => {
  it("renders the navbar with brand name", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("SecureVault")).toBeInTheDocument();
  });

  it("renders the Login and Get Started links in the navbar", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get Started" })).toBeInTheDocument();
  });

  it("renders the hero section heading", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("Secure Your Secrets, Simplify Your Workflow")).toBeInTheDocument();
  });

  it("renders the hero CTA links", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByRole("link", { name: "Start Free Trial" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Demo" })).toBeInTheDocument();
  });

  it("renders the Why section heading", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("Why SecureVault?")).toBeInTheDocument();
  });

  it("renders each Why section card title", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("Military-Grade Security")).toBeInTheDocument();
    expect(screen.getByText("Self-Hosted Control")).toBeInTheDocument();
    expect(screen.getByText("Team Collaboration")).toBeInTheDocument();
  });

  it("renders the How It Works section heading", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });

  it("renders each How It Works step title", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("Create Projects")).toBeInTheDocument();
    expect(screen.getByText("Store Secrets Securely")).toBeInTheDocument();
    expect(screen.getByText("Access Anywhere")).toBeInTheDocument();
  });

  it("renders the Features section heading", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("Enterprise-Grade Features")).toBeInTheDocument();
  });

  it("renders each Features card title", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("AES-256 Encryption")).toBeInTheDocument();
    expect(screen.getByText("Access Control")).toBeInTheDocument();
    expect(screen.getByText("Developer-Friendly API")).toBeInTheDocument();
    expect(screen.getByText("Self-Hosted")).toBeInTheDocument();
  });

  it("renders the CTA section heading and link", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("Ready to Secure Your Secrets?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get Started Now" })).toBeInTheDocument();
  });

  it("renders the footer with copyright", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText(/2026 SecureVault/)).toBeInTheDocument();
  });
});
