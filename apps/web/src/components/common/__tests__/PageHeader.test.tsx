import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { PageHeader } from "@/components/common/PageHeader";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<PageHeader />", () => {
  it("should render the title", () => {
    renderWithRouter(<PageHeader title="My Page" />);
    expect(screen.getByRole("heading", { name: "My Page" })).toBeInTheDocument();
  });

  it("should render the subtitle when provided", () => {
    renderWithRouter(<PageHeader title="My Page" subtitle="A page subtitle" />);
    expect(screen.getByText("A page subtitle")).toBeInTheDocument();
  });

  it("should not render a subtitle when not provided", () => {
    renderWithRouter(<PageHeader title="My Page" />);
    const h1 = screen.getByRole("heading", { name: "My Page" });
    const parentDiv = h1.parentElement;
    expect(parentDiv?.querySelector("p")).toBeNull();
  });

  it("should render the action button when actionLabel and onAction are provided", () => {
    const onAction = vi.fn();
    renderWithRouter(<PageHeader title="My Page" actionLabel="Create" onAction={onAction} />);

    const button = screen.getByRole("button", { name: /Create/ });
    expect(button).toBeInTheDocument();
  });

  it("should call onAction when the button is clicked", async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(<PageHeader title="My Page" actionLabel="Create" onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: /Create/ }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("should not render an action button if actionLabel is missing", () => {
    const onAction = vi.fn();
    renderWithRouter(<PageHeader title="My Page" onAction={onAction} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should not render an action button if onAction is missing", () => {
    renderWithRouter(<PageHeader title="My Page" actionLabel="Create" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should render a back link when backTo is provided", () => {
    renderWithRouter(<PageHeader title="My Page" backTo={{ label: "Back", to: "/dashboard" }} />);

    const link = screen.getByRole("link", { name: /Back/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("should not render a back link when backTo is not provided", () => {
    renderWithRouter(<PageHeader title="My Page" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
