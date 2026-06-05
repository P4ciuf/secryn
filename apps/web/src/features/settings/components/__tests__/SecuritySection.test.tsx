import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SecuritySection } from "@/features/settings/components/SecuritySection";

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

function fillFields(current: string, newPw: string, confirm: string) {
  const allInputs = () => screen.getAllByPlaceholderText("••••••••") as HTMLInputElement[];
  fireEvent.change(allInputs()[0], { target: { value: current } });
  fireEvent.change(allInputs()[1], { target: { value: newPw } });
  fireEvent.change(allInputs()[2], { target: { value: confirm } });
}

describe("<SecuritySection />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the section heading", () => {
    render(<SecuritySection />);
    expect(screen.getByRole("heading", { name: "Security" })).toBeInTheDocument();
  });

  it("should render password fields", () => {
    render(<SecuritySection />);
    expect(screen.getAllByPlaceholderText("••••••••")).toHaveLength(3);
  });

  it("should render Update Password button", () => {
    render(<SecuritySection />);
    expect(screen.getByRole("button", { name: "Update Password" })).toBeInTheDocument();
  });

  it("should show validation error when fields are empty", () => {
    render(<SecuritySection />);
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
    expect(screen.getByText("All password fields are required")).toBeInTheDocument();
  });

  it("should show validation error when passwords do not match", () => {
    vi.mocked(api.put).mockResolvedValue(undefined);
    render(<SecuritySection />);
    fillFields("oldpass", "newpass1", "newpass2");
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
    expect(screen.getByText("New passwords do not match")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("should show validation error when new password is too short", () => {
    vi.mocked(api.put).mockResolvedValue(undefined);
    render(<SecuritySection />);
    fillFields("oldpass", "short", "short");
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
    expect(screen.getByText("New password must be at least 8 characters")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("should call api.put on valid input", () => {
    vi.mocked(api.put).mockResolvedValue(undefined);
    render(<SecuritySection />);
    fillFields("oldpass", "newpassword123", "newpassword123");
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
    expect(api.put).toHaveBeenCalledWith("/users", {
      currentPassword: "oldpass",
      newPassword: "newpassword123",
    });
  });

  it("should clear fields and show success after valid update", async () => {
    vi.mocked(api.put).mockResolvedValue(undefined);
    render(<SecuritySection />);
    fillFields("oldpass", "newpassword123", "newpassword123");
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(screen.getByText("Password updated successfully")).toBeInTheDocument();
    });

    const inputs = screen.getAllByPlaceholderText("••••••••") as HTMLInputElement[];
    expect(inputs[0].value).toBe("");
    expect(inputs[1].value).toBe("");
    expect(inputs[2].value).toBe("");
  });

  it("should show error when api fails", async () => {
    vi.mocked(api.put).mockRejectedValue(new Error("Update failed"));
    render(<SecuritySection />);
    fillFields("oldpass", "newpassword123", "newpassword123");
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  it("should show loading state while updating", () => {
    let finishUpdate!: () => void;
    vi.mocked(api.put).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishUpdate = () => resolve(undefined);
        }),
    );

    render(<SecuritySection />);
    fillFields("oldpass", "newpassword123", "newpassword123");
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    expect(screen.getByRole("button", { name: "Updating..." })).toBeInTheDocument();

    finishUpdate();
  });
});
