import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import DashboardLayout from "@/layouts/DashboardLayout";

vi.mock("@/features/dashboard/components/Sidebar", () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

vi.mock("@/features/dashboard/components/MobileSidebar", () => ({
  MobileSidebar: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="mock-mobile-sidebar">
      <button data-testid="mobile-close-btn" onClick={onClose}>
        Close
      </button>
    </div>
  ),
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
  return render(<RouterProvider router={router} />);
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
    expect(screen.queryByTestId("mock-mobile-sidebar")).not.toBeInTheDocument();
  });

  it("should show mobile sidebar when topbar menu is clicked", () => {
    renderDashboardLayout();
    const menuButton = screen.getByTestId("mock-topbar-menu");
    menuButton.click();
    expect(screen.getByTestId("mock-mobile-sidebar")).toBeInTheDocument();
  });

  it("should close mobile sidebar when close is called", () => {
    renderDashboardLayout();
    const menuButton = screen.getByTestId("mock-topbar-menu");
    menuButton.click();
    expect(screen.getByTestId("mock-mobile-sidebar")).toBeInTheDocument();

    const closeButton = screen.getByTestId("mobile-close-btn");
    closeButton.click();
    expect(screen.queryByTestId("mock-mobile-sidebar")).not.toBeInTheDocument();
  });
});
