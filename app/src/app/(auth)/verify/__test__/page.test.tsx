import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import VerifyPage from "../page";

vi.mock("@/components/auth/verifyButton", () => ({
  VerifyButton: () => <button type="button">verify your profile</button>,
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

  it("renders the page heading and description", () => {
    render(<VerifyPage />);

    expect(screen.getByRole("heading", { name: /verify your account/i })).toBeInTheDocument();
    expect(screen.getByText(/confirm your email address/i)).toBeInTheDocument();
  });

  it("renders a link back to the dashboard", () => {
    render(<VerifyPage />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders the verify button", () => {
    render(<VerifyPage />);

    expect(screen.getByRole("button", { name: /verify your profile/i })).toBeInTheDocument();
  });
});
