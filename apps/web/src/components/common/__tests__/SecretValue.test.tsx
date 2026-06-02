import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecretValue } from "@/components/common/SecretValue";

vi.mock("@/hooks/use-clipboard", () => ({
  useClipboard: () => ({
    copied: false,
    copyToClipboard: vi.fn(),
  }),
}));

describe("<SecretValue />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the masked value when not visible", () => {
    const onToggle = vi.fn();
    render(<SecretValue value="my-secret-123" isVisible={false} onToggle={onToggle} />);

    expect(screen.getByText(/••/)).toBeInTheDocument();
    expect(screen.queryByText("my-secret-123")).not.toBeInTheDocument();
  });

  it("should render the real value when visible", () => {
    const onToggle = vi.fn();
    render(<SecretValue value="my-secret-123" isVisible={true} onToggle={onToggle} />);

    expect(screen.getByText("my-secret-123")).toBeInTheDocument();
  });

  it("should call onToggle when the visibility button is clicked", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(<SecretValue value="secret" isVisible={false} onToggle={onToggle} />);

    const toggleButton = screen.getByRole("button", { name: "Show" });
    await user.click(toggleButton);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("should show Hide button title when visible is true", () => {
    const onToggle = vi.fn();
    render(<SecretValue value="secret" isVisible={true} onToggle={onToggle} />);

    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
  });

  it("should show Show button title when visible is false", () => {
    const onToggle = vi.fn();
    render(<SecretValue value="secret" isVisible={false} onToggle={onToggle} />);

    expect(screen.getByRole("button", { name: "Show" })).toBeInTheDocument();
  });

  it("should use the custom maskedPrefix when provided", () => {
    const onToggle = vi.fn();
    render(
      <SecretValue
        value="sk_test_abc123"
        isVisible={false}
        onToggle={onToggle}
        maskedPrefix="sk_"
      />,
    );

    expect(screen.getByText(/sk_/)).toBeInTheDocument();
  });

  it("should render a Copy button", () => {
    const onToggle = vi.fn();
    render(<SecretValue value="secret" isVisible={false} onToggle={onToggle} />);

    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });
});
