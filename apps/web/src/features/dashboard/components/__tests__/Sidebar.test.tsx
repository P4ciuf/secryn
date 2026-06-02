import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Sidebar } from "@/features/dashboard/components/Sidebar";

vi.mock("@/features/dashboard/components/SidebarNav", () => ({
  SidebarNav: () => <nav data-testid="mock-sidebar-nav">Nav</nav>,
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<Sidebar />", () => {
  it("should render the SecureVault brand", () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText("SecureVault")).toBeInTheDocument();
  });

  it("should render the SidebarNav component", () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByTestId("mock-sidebar-nav")).toBeInTheDocument();
  });

  it("should render the Logout button", () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
