import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import RegisterPage from "@/features/auth/RegisterPage";
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

function fillRegisterForm(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): void {
  fireEvent.change(screen.getByPlaceholderText("John Doe"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
    target: { value: email },
  });
  fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0]!, {
    target: { value: password },
  });
  fireEvent.change(screen.getAllByPlaceholderText("••••••••")[1]!, {
    target: { value: confirmPassword },
  });
}

async function agreeToTerms(): Promise<void> {
  const user = userEvent.setup();
  const termsCheckbox = screen.getByRole("checkbox");
  await user.click(termsCheckbox);
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the registration form", () => {
    renderWithRouter(<RegisterPage />);

    expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("••••••••")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
  });

  it("should render the AuthLayout title", () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
  });

  it("should allow filling all fields", async () => {
    renderWithRouter(<RegisterPage />);

    fillRegisterForm("Jane Doe", "jane@example.com", "password123", "password123");

    expect(screen.getByPlaceholderText("John Doe")).toHaveValue("Jane Doe");
    expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("jane@example.com");
    const passwords = screen.getAllByPlaceholderText("••••••••");
    expect(passwords[0]).toHaveValue("password123");
    expect(passwords[1]).toHaveValue("password123");
  });

  it("should show error when passwords do not match", async () => {
    renderWithRouter(<RegisterPage />);

    fillRegisterForm("Jane Doe", "jane@example.com", "password123", "different");
    await agreeToTerms();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("should show loading state when submitting", async () => {
    let finishPost!: () => void;
    vi.mocked(api.post).mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          finishPost = () => resolve(undefined);
        }),
    );

    renderWithRouter(<RegisterPage />);
    fillRegisterForm("Jane Doe", "jane@example.com", "password123", "password123");
    await agreeToTerms();

    const user = userEvent.setup();
    const clickPromise = user.click(screen.getByRole("button", { name: "Create Account" }));

    const loadingButton = await screen.findByRole("button", { name: "Creating Account..." });
    expect(loadingButton).toBeInTheDocument();

    finishPost();
    await clickPromise;
  });

  it("should show error message when API fails", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError(409, "Email already exists"));

    renderWithRouter(<RegisterPage />);
    fillRegisterForm("Jane Doe", "jane@example.com", "password123", "password123");
    await agreeToTerms();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(screen.getByText("Email already exists")).toBeInTheDocument();
  });

  it("should call api.post and navigate on successful submit", async () => {
    vi.mocked(api.post).mockResolvedValueOnce(undefined);

    renderWithRouter(<RegisterPage />);
    fillRegisterForm("Jane Doe", "jane@example.com", "password123", "password123");
    await agreeToTerms();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      username: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/projects");
  });

  it("should render terms of service and privacy links", () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });
});
