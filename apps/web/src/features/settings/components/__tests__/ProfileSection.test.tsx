import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileSection } from "@/features/settings/components/ProfileSection";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
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

import { api } from "@/lib/api";

const mockUser = {
  id: "1",
  email: "john@example.com",
  username: "John Doe",
  role: "admin",
  createdAt: "2026-01-01",
  updatedAt: "2026-06-01",
};

describe("<ProfileSection />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the section heading", () => {
    vi.mocked(api.get).mockResolvedValue(mockUser);
    render(<ProfileSection />);
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("should show loading skeleton while fetching user data", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(<ProfileSection />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("should render Full Name and Email inputs with fetched values", async () => {
    vi.mocked(api.get).mockResolvedValue(mockUser);
    render(<ProfileSection />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
  });

  it("should render Save Changes button", async () => {
    vi.mocked(api.get).mockResolvedValue(mockUser);
    render(<ProfileSection />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });
  });

  it("should show error when fetching user fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
    render(<ProfileSection />);
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should call api.put on Save Changes and show success", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue(mockUser);
    vi.mocked(api.put).mockResolvedValue(mockUser);
    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(api.put).toHaveBeenCalledWith("/users", {
      name: "John Doe",
      email: "john@example.com",
    });

    await waitFor(() => {
      expect(screen.getByText("Profile updated successfully")).toBeInTheDocument();
    });
  });

  it("should show error when save fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue(mockUser);
    vi.mocked(api.put).mockRejectedValue(new Error("Save failed"));
    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.getByText("Save failed")).toBeInTheDocument();
    });
  });

  it("should show Saving... text while saving", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue(mockUser);

    let finishSave!: () => void;
    vi.mocked(api.put).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSave = () => resolve(mockUser);
        }),
    );

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    const clickPromise = user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();
    });

    finishSave();
    await clickPromise;
  });
});
