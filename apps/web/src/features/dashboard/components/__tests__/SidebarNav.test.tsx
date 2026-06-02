import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SidebarNav } from "@/features/dashboard/components/SidebarNav";

function renderWithRouter(ui: React.ReactElement, initialPath = "/dashboard/projects") {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}

describe("<SidebarNav />", () => {
  it("should render all navigation items", () => {
    renderWithRouter(<SidebarNav />);
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("API Keys")).toBeInTheDocument();
    expect(screen.getByText("API Docs")).toBeInTheDocument();
    expect(screen.getByText("Webhooks")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should highlight the active route", () => {
    renderWithRouter(<SidebarNav />, "/dashboard/projects");

    const projectLink = screen.getByText("Projects").closest("a");
    expect(projectLink?.className).toContain("bg-blue-600");
  });

  it("should not highlight inactive routes", () => {
    renderWithRouter(<SidebarNav />, "/dashboard/projects");

    const settingsLink = screen.getByText("Settings").closest("a");
    expect(settingsLink?.className).not.toContain("bg-blue-600");
  });

  it("should match sub-routes with startsWith", () => {
    renderWithRouter(<SidebarNav />, "/dashboard/projects/1/secrets");

    const projectLink = screen.getByText("Projects").closest("a");
    expect(projectLink?.className).toContain("bg-blue-600");
  });

  it("should call onItemClick when a nav item is clicked", async () => {
    const onItemClick = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(<SidebarNav onItemClick={onItemClick} />);

    await user.click(screen.getByText("Projects"));
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });

  it("should render navigation links with correct hrefs", () => {
    renderWithRouter(<SidebarNav />);

    expect(screen.getByText("Projects").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/projects",
    );
    expect(screen.getByText("API Keys").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/api-keys",
    );
    expect(screen.getByText("API Docs").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/api-docs",
    );
    expect(screen.getByText("Webhooks").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/webhooks",
    );
    expect(screen.getByText("Settings").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/settings",
    );
  });
});
