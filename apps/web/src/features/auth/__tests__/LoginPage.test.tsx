import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import LoginPage from "@/features/auth/LoginPage";
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

function fillLoginForm(email: string, password: string): void {
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), {
    target: { value: password },
  });
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the login form with email and password fields", () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("should render the AuthLayout title", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("should allow typing in email and password fields", async () => {
    renderWithRouter(<LoginPage />);

    fillLoginForm("test@example.com", "password123");

    expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("test@example.com");
    expect(screen.getByPlaceholderText("••••••••")).toHaveValue("password123");
  });

  it("should show loading state when submitting", async () => {
    const user = userEvent.setup();

    let finishPost!: () => void;
    vi.mocked(api.post).mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          finishPost = () => resolve(undefined);
        }),
    );

    renderWithRouter(<LoginPage />);
    fillLoginForm("test@example.com", "password123");

    const clickPromise = user.click(screen.getByRole("button", { name: "Sign In" }));

    const loadingButton = await screen.findByRole("button", { name: "Signing In..." });
    expect(loadingButton).toBeInTheDocument();

    finishPost();
    await clickPromise;
  });

  it("should show error message when API fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError(401, "Invalid credentials"));
    renderWithRouter(<LoginPage />);

    fillLoginForm("test@example.com", "wrong");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("should call api.post and navigate on successful submit", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce(undefined);
    renderWithRouter(<LoginPage />);

    fillLoginForm("test@example.com", "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      email: "test@example.com",
      password: "password123",
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/projects");
  });

  it("should render the Remember me checkbox", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText("Remember me")).toBeInTheDocument();
  });

  it("should render the Forgot password link", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });
});
