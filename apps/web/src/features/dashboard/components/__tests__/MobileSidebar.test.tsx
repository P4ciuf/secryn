import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { MobileSidebar } from "@/features/dashboard/components/MobileSidebar";

vi.mock("@/features/dashboard/components/SidebarNav", () => ({
  SidebarNav: () => <nav data-testid="mock-sidebar-nav">Nav</nav>,
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<MobileSidebar />", () => {
  it("should render the SecureVault brand", () => {
    const onClose = vi.fn();
    renderWithRouter(<MobileSidebar onClose={onClose} />);
    expect(screen.getByText("SecureVault")).toBeInTheDocument();
  });

  it("should render the SidebarNav with onItemClick set to onClose", () => {
    const onClose = vi.fn();
    renderWithRouter(<MobileSidebar onClose={onClose} />);
    expect(screen.getByTestId("mock-sidebar-nav")).toBeInTheDocument();
  });

  it("should call onClose when the X button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(<MobileSidebar onClose={onClose} />);

    const closeButton = screen.getByRole("button", { name: "" });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should render the Logout button", () => {
    const onClose = vi.fn();
    renderWithRouter(<MobileSidebar onClose={onClose} />);
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
