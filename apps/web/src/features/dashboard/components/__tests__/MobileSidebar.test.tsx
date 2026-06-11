import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { MobileSidebar } from "@/features/dashboard/components/MobileSidebar";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ ok: true }),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class extends Error {
    status: number;
    data: unknown;
    constructor(status: number, message: string, data?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  },
}));

vi.mock("@/features/dashboard/components/SidebarNav", () => ({
  SidebarNav: () => <nav data-testid="mock-sidebar-nav">Nav</nav>,
}));

import { api } from "@/lib/api";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<MobileSidebar />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the Secryn brand", () => {
    const onClose = vi.fn();
    renderWithRouter(<MobileSidebar onClose={onClose} />);
    expect(screen.getByText("Secryn")).toBeInTheDocument();
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

  it("should call api.post and navigate to login on logout click", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(<MobileSidebar onClose={onClose} />);
    await user.click(screen.getByText("Logout"));

    expect(api.post).toHaveBeenCalledWith("/auth/logout");
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("should still navigate to login when logout API call fails", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce(new Error("Network error"));
    renderWithRouter(<MobileSidebar onClose={onClose} />);

    await user.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
