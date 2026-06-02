import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import AuthLayout from "@/features/auth/components/AuthLayout";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<AuthLayout />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the title and subtitle", () => {
    renderWithRouter(
      <AuthLayout
        title="Sign In"
        subtitle="Welcome back"
        footerPrompt="No account?"
        footerLinkText="Register"
        footerLinkTo="/register"
      >
        <p>Form content</p>
      </AuthLayout>,
    );

    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("should render children content", () => {
    renderWithRouter(
      <AuthLayout
        title="Sign In"
        subtitle="Welcome"
        footerPrompt="No account?"
        footerLinkText="Register"
        footerLinkTo="/register"
      >
        <button>Submit</button>
      </AuthLayout>,
    );

    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("should render the footer prompt and link", () => {
    renderWithRouter(
      <AuthLayout
        title="Sign In"
        subtitle="Welcome"
        footerPrompt="Don't have an account?"
        footerLinkText="Sign up"
        footerLinkTo="/register"
      >
        <p>Form</p>
      </AuthLayout>,
    );

    expect(screen.getByText(/Don't have an account\?/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Sign up" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/register");
  });

  it("should render the Back to home link", () => {
    renderWithRouter(
      <AuthLayout
        title="Sign In"
        subtitle="Welcome"
        footerPrompt="No account?"
        footerLinkText="Register"
        footerLinkTo="/register"
      >
        <p>Form</p>
      </AuthLayout>,
    );

    const homeLink = screen.getByRole("link", { name: /Back to home/ });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
