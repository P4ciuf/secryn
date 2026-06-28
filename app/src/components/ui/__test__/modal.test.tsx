import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../modal";

vi.mock("lucide-react", () => ({
  X: () => <span data-testid="close-icon" />,
}));

describe("Modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders nothing when open is false", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders the title and children when open", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal body content</p>
      </Modal>,
    );

    expect(screen.getByRole("heading", { name: "Test Modal" })).toBeInTheDocument();
    expect(screen.getByText("Modal body content")).toBeInTheDocument();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    const backdrop = container.querySelector(".fixed.inset-0.bg-black\\/60");
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the X button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    await user.click(screen.getByRole("button", { name: "" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sets body overflow to hidden when open", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body overflow when closed", () => {
    const { unmount } = render(
      <Modal open={true} onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    unmount();

    expect(document.body.style.overflow).toBe("");
  });
});
