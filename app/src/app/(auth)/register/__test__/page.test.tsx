import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "../page";

const { mockRegisterAction } = vi.hoisted(() => ({ mockRegisterAction: vi.fn() }));
vi.mock("@/app/(auth)/actions", () => ({
  registerAction: mockRegisterAction,
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useParams: () => ({}),
  usePathname: () => "/register",
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    landing: "/",
    login: "/login",
    register: "/register",
    dashboard: { path: "/dashboard", children: {} },
  },
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the registration form", () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("shows password mismatch error", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^Email$/i), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "different123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(mockRegisterAction).not.toHaveBeenCalled();
  });

  it("shows password too short error", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^Email$/i), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(mockRegisterAction).not.toHaveBeenCalled();
  });

  it("shows error on submit failure", async () => {
    mockRegisterAction.mockRejectedValue(new Error("Email already taken"));
    const user = userEvent.setup();

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await screen.findByText("Email already taken");
  });

  it("redirects to dashboard on successful registration", async () => {
    mockRegisterAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("passes username as undefined when empty", async () => {
    mockRegisterAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await vi.waitFor(() => {
      expect(mockRegisterAction).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
        username: undefined,
      });
    });
  });

  it("shows loading state during submission", async () => {
    mockRegisterAction.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
    );
    const user = userEvent.setup();

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });
});
