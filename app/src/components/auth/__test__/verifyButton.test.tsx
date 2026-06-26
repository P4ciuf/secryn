import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VerifyButton } from "../verifyButton";

const { mockVerifyAccountAction } = vi.hoisted(() => ({
  mockVerifyAccountAction: vi.fn(),
}));

vi.mock("@/app/(auth)/actions", () => ({
  verifyAccountAction: mockVerifyAccountAction,
}));

describe("VerifyButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the button with initial label", () => {
    render(<VerifyButton />);

    const button = screen.getByRole("button", { name: /verify your profile/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("calls verifyAccountAction on click", async () => {
    mockVerifyAccountAction.mockResolvedValue({
      success: false,
      error: "",
    });
    const user = userEvent.setup();

    render(<VerifyButton />);

    await user.click(screen.getByRole("button", { name: /verify your profile/i }));

    expect(mockVerifyAccountAction).toHaveBeenCalled();
  });

  it("shows verified state and disables button on success", async () => {
    mockVerifyAccountAction.mockResolvedValue({
      success: true,
      data: undefined,
    });
    const user = userEvent.setup();

    render(<VerifyButton />);

    await user.click(screen.getByRole("button"));

    expect(await screen.findByRole("button", { name: "verified" })).toBeDisabled();
  });
});
