import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecretValue } from "../SecretValue";

const mockWriteText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true,
  });
});

describe("<SecretValue />", () => {
  it("should show masked value when isVisible is false", () => {
    render(<SecretValue value="sk-1234567890abcdef" isVisible={false} onToggle={vi.fn()} />);
    expect(screen.getByText(/^\u2022\u2022/)).toBeInTheDocument();
    expect(screen.queryByText("sk-1234567890abcdef")).not.toBeInTheDocument();
  });

  it("should show the plain-text value when isVisible is true", () => {
    render(<SecretValue value="sk-1234567890abcdef" isVisible={true} onToggle={vi.fn()} />);
    expect(screen.getByText("sk-1234567890abcdef")).toBeInTheDocument();
  });

  it("should call onToggle when the show/hide button is clicked", async () => {
    const handleToggle = vi.fn();
    render(<SecretValue value="secret" isVisible={false} onToggle={handleToggle} />);
    const toggleBtn = screen.getByTitle("Show");
    await userEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledOnce();
  });

  it("should show the hide icon when visible", () => {
    render(<SecretValue value="secret" isVisible={true} onToggle={vi.fn()} />);
    expect(screen.getByTitle("Hide")).toBeInTheDocument();
  });

  it("should copy the value to clipboard when the copy button is clicked", async () => {
    render(<SecretValue value="my-secret-token" isVisible={true} onToggle={vi.fn()} />);
    await userEvent.click(screen.getByTitle("Copy"));
    expect(mockWriteText).toHaveBeenCalledWith("my-secret-token");
  });

  it("should use the custom maskedPrefix when provided", () => {
    render(<SecretValue value="token" isVisible={false} onToggle={vi.fn()} maskedPrefix="***" />);
    expect(screen.getByText(/^\*\*\*/)).toBeInTheDocument();
  });

  it("should use the default maskedPrefix when omitted", () => {
    render(<SecretValue value="token" isVisible={false} onToggle={vi.fn()} />);
    expect(screen.getByText(/^\u2022\u2022/)).toBeInTheDocument();
  });
});
