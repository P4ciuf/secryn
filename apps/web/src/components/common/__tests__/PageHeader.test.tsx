import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { PageHeader } from "../PageHeader";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<PageHeader />", () => {
  it("should render the title", () => {
    renderWithRouter(<PageHeader title="Dashboard" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("should render the subtitle when provided", () => {
    renderWithRouter(<PageHeader title="Dashboard" subtitle="Manage your projects" />);
    expect(screen.getByText("Manage your projects")).toBeInTheDocument();
  });

  it("should not render the subtitle when omitted", () => {
    renderWithRouter(<PageHeader title="Dashboard" />);
    expect(screen.queryByText("Manage your projects")).not.toBeInTheDocument();
  });

  it("should render the action button when actionLabel and onAction are provided", () => {
    const handleAction = vi.fn();
    renderWithRouter(
      <PageHeader title="Projects" actionLabel="New Project" onAction={handleAction} />,
    );
    const btn = screen.getByText("New Project");
    expect(btn).toBeInTheDocument();
  });

  it("should call onAction when the action button is clicked", async () => {
    const handleAction = vi.fn();
    renderWithRouter(
      <PageHeader title="Projects" actionLabel="New Project" onAction={handleAction} />,
    );
    await userEvent.click(screen.getByText("New Project"));
    expect(handleAction).toHaveBeenCalledOnce();
  });

  it("should not render the action button when onAction is missing", () => {
    renderWithRouter(<PageHeader title="Projects" actionLabel="New Project" />);
    expect(screen.queryByText("New Project")).not.toBeInTheDocument();
  });

  it("should render the back link when backTo is provided", () => {
    renderWithRouter(
      <PageHeader title="Secrets" backTo={{ label: "Back to Projects", to: "/projects" }} />,
    );
    const link = screen.getByText("Back to Projects");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/projects");
  });

  it("should not render the back link when backTo is omitted", () => {
    renderWithRouter(<PageHeader title="Dashboard" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("should render the secondary action button when provided", () => {
    const handleSecondary = vi.fn();
    renderWithRouter(
      <PageHeader
        title="Secrets"
        secondaryAction={{ label: "Export", onClick: handleSecondary }}
      />,
    );
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("should call secondaryAction.onClick when clicked", async () => {
    const handleSecondary = vi.fn();
    renderWithRouter(
      <PageHeader
        title="Secrets"
        secondaryAction={{ label: "Export", onClick: handleSecondary }}
      />,
    );
    await userEvent.click(screen.getByText("Export"));
    expect(handleSecondary).toHaveBeenCalledOnce();
  });

  it("should render both primary and secondary actions together", () => {
    const handlePrimary = vi.fn();
    const handleSecondary = vi.fn();
    renderWithRouter(
      <PageHeader
        title="Projects"
        actionLabel="New"
        onAction={handlePrimary}
        secondaryAction={{ label: "Export", onClick: handleSecondary }}
      />,
    );
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });
});
