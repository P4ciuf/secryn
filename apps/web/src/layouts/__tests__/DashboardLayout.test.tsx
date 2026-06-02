import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardLayout from "@/layouts/DashboardLayout";

vi.mock("@/features/dashboard/components/Sidebar", () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

vi.mock("@/features/dashboard/components/TopBar", () => ({
  TopBar: ({ onMenuClick }: { onMenuClick: () => void }) => (
    <button data-testid="mock-topbar-menu" onClick={onMenuClick}>
      Menu
    </button>
  ),
}));

import { createMemoryRouter, RouterProvider } from "react-router";

function renderDashboardLayout() {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: DashboardLayout,
        children: [
          {
            index: true,
            Component: () => <div data-testid="child-content">Dashboard Content</div>,
          },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );
  const result = render(<RouterProvider router={router} />);
  return { user, ...result };
}

describe("DashboardLayout", () => {
  it("should render the sidebar", () => {
    renderDashboardLayout();
    expect(screen.getByTestId("mock-sidebar")).toBeInTheDocument();
  });

  it("should render the top bar", () => {
    renderDashboardLayout();
    expect(screen.getByTestId("mock-topbar-menu")).toBeInTheDocument();
  });

  it("should render child routes via Outlet", () => {
    renderDashboardLayout();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("should not show mobile sidebar by default", () => {
    renderDashboardLayout();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("should show mobile sidebar when topbar menu is clicked", async () => {
    const { user } = renderDashboardLayout();
    await user.click(screen.getByTestId("mock-topbar-menu"));
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("should close mobile sidebar when close is called", async () => {
    const { user } = renderDashboardLayout();
    await user.click(screen.getByTestId("mock-topbar-menu"));

    const mobileSidebar = screen.getByRole("complementary");
    expect(mobileSidebar).toBeInTheDocument();

    const closeButton = within(mobileSidebar).getAllByRole("button")[0];
    await user.click(closeButton);

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
