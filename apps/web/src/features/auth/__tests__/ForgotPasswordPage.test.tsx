import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";
import { api, ApiError } from "@/lib/api";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email input and submit button", () => {
    renderWithRouter(<ForgotPasswordPage />);

    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Reset Link" })).toBeInTheDocument();
  });

  it("shows success message after successful submission", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce(undefined);
    renderWithRouter(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(screen.getByText("Check your inbox")).toBeInTheDocument();
  });

  it("shows error message when API fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError(404, "Email not found"));
    renderWithRouter(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(screen.getByText("Email not found")).toBeInTheDocument();
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

    renderWithRouter(<ForgotPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });

    const clickPromise = user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    const loadingButton = await screen.findByRole("button", { name: "Sending..." });
    expect(loadingButton).toBeInTheDocument();

    finishPost();
    await clickPromise;
  });

  it("navigates to login when clicking Back to Sign In", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce(undefined);
    renderWithRouter(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await user.click(screen.getByRole("button", { name: "Back to Sign In" }));

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
