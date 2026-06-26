import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "../pageHeader";

describe("PageHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title", () => {
    render(<PageHeader title="Dashboard" />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders a description when provided", () => {
    render(<PageHeader title="Dashboard" description="Manage your projects" />);

    expect(screen.getByText("Manage your projects")).toBeInTheDocument();
  });

  it("does not render description text when omitted", () => {
    const { container } = render(<PageHeader title="Dashboard" />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(0);
  });

  it("renders an action slot when provided", () => {
    render(<PageHeader title="Dashboard" action={<button type="button">New Project</button>} />);

    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("does not render an action area when omitted", () => {
    render(<PageHeader title="Dashboard" />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
