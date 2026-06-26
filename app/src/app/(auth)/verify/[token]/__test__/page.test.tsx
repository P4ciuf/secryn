import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import VerifyPage from "../page";

vi.mock("@/components/auth/verifyButton", () => ({
  VerifyButton: ({ token }: { token: string }) => (
    <button type="button" data-testid="verify-button" data-token={token}>
      verify your profile
    </button>
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
}));

describe("VerifyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page heading and description", async () => {
    const jsx = await VerifyPage({
      params: Promise.resolve({ token: "test-token" }),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: /verify your account/i })).toBeInTheDocument();
    expect(screen.getByText(/confirm your email address/i)).toBeInTheDocument();
  });

  it("renders a link back to the dashboard", async () => {
    const jsx = await VerifyPage({
      params: Promise.resolve({ token: "test-token" }),
    });
    render(jsx);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders the verify button with the token prop", async () => {
    const jsx = await VerifyPage({
      params: Promise.resolve({ token: "test-token" }),
    });
    render(jsx);

    const button = screen.getByTestId("verify-button");
    expect(button).toHaveAttribute("data-token", "test-token");
  });
});
