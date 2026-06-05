import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { DangerZoneSection } from "@/features/settings/components/DangerZoneSection";

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

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <DangerZoneSection />
    </MemoryRouter>,
  );
}

describe("<DangerZoneSection />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the section heading", () => {
    renderWithRouter();
    expect(screen.getByRole("heading", { name: "Danger Zone" })).toBeInTheDocument();
  });

  it("should render the warning message", () => {
    renderWithRouter();
    expect(
      screen.getByText("Once you delete your account, there is no going back. Please be certain."),
    ).toBeInTheDocument();
  });

  it("should render the Delete Account button", () => {
    renderWithRouter();
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeInTheDocument();
  });

  it("should call api.delete and navigate on confirmed deletion", async () => {
    const user = userEvent.setup();
    vi.mocked(api.delete).mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithRouter();
    await user.click(screen.getByRole("button", { name: "Delete Account" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(api.delete).toHaveBeenCalledWith("/users");

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    confirmSpy.mockRestore();
  });

  it("should not call api.delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderWithRouter();
    await user.click(screen.getByRole("button", { name: "Delete Account" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("should show Deleting... text while loading", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    let finishDelete!: () => void;
    vi.mocked(api.delete).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishDelete = () => resolve(undefined);
        }),
    );

    renderWithRouter();
    const clickPromise = user.click(screen.getByRole("button", { name: "Delete Account" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Deleting..." })).toBeInTheDocument();
    });

    finishDelete();
    await clickPromise;
  });

  it("should show error when deletion fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockRejectedValue(new Error("Delete failed"));

    renderWithRouter();
    await user.click(screen.getByRole("button", { name: "Delete Account" }));

    await waitFor(() => {
      expect(screen.getByText("Delete failed")).toBeInTheDocument();
    });
  });
});
