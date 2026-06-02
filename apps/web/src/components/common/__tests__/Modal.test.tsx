import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/common/Modal";

describe("<Modal />", () => {
  it("should render nothing when open is false", () => {
    const onClose = vi.fn();
    render(
      <Modal open={false} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );

    expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("should render the title and children when open is true", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );

    expect(screen.getByRole("heading", { name: "Test Modal" })).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("should call onClose when the overlay is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );

    const overlay = screen
      .getByRole("heading", { name: "Test Modal" })
      .closest("div")?.parentElement;
    expect(overlay).toBeTruthy();

    if (overlay) {
      await user.click(overlay);
    }

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should not call onClose when clicking inside the modal content", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );

    await user.click(screen.getByText("Modal content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("should apply the default maxWidth class", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    const modalCard = screen.getByText("Content").closest("div");
    expect(modalCard?.className).toContain("max-w-lg");
  });

  it("should apply a custom maxWidth class", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal" maxWidth="max-w-2xl">
        <p>Content</p>
      </Modal>,
    );

    const modalCard = screen.getByText("Content").closest("div");
    expect(modalCard?.className).toContain("max-w-2xl");
  });
});
