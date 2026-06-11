import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";
import { api, ApiError } from "@/lib/api";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ token: "valid-token-123" }),
  };
});

vi.mock("@/lib/api", () => {
  class MockApiError extends Error {
    status: number;
    data: unknown;
    constructor(status: number, message: string, data?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  }
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
    ApiError: MockApiError,
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={["/reset-password/valid-token-123"]}>{ui}</MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders password and confirm password inputs", () => {
    renderWithRouter(<ResetPasswordPage />);

    expect(screen.getByPlaceholderText("Minimum 8 characters")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Re-enter your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset Password" })).toBeInTheDocument();
  });

  it("shows client-side error when password is too short", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("Minimum 8 characters"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
      target: { value: "short" },
    });

    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  it("shows client-side error when passwords don't match", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("Minimum 8 characters"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
      target: { value: "password456" },
    });

    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("shows success after successful submission", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce(undefined);
    renderWithRouter(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("Minimum 8 characters"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
      target: { value: "password123" },
    });

    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(screen.getByText("Password updated")).toBeInTheDocument();
  });

  it("shows API error message", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError(400, "Invalid or expired token"));
    renderWithRouter(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("Minimum 8 characters"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
      target: { value: "password123" },
    });

    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(screen.getByText("Invalid or expired token")).toBeInTheDocument();
  });

  it("shows loading state while submitting", async () => {
    const user = userEvent.setup();

    let finishPost!: () => void;
    vi.mocked(api.post).mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          finishPost = () => resolve(undefined);
        }),
    );

    renderWithRouter(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("Minimum 8 characters"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
      target: { value: "password123" },
    });

    const clickPromise = user.click(screen.getByRole("button", { name: "Reset Password" }));

    const loadingButton = await screen.findByRole("button", { name: "Resetting..." });
    expect(loadingButton).toBeInTheDocument();

    finishPost();
    await clickPromise;
  });

  it("renders with token in URL", () => {
    renderWithRouter(<ResetPasswordPage />);

    expect(screen.getByPlaceholderText("Minimum 8 characters")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Re-enter your password")).toBeInTheDocument();
  });
});
