import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../Modal";

describe("<Modal />", () => {
  it("should render nothing when open is false", () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Test Modal">
        <p>Body content</p>
      </Modal>,
    );
    expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
    expect(screen.queryByText("Body content")).not.toBeInTheDocument();
  });

  it("should render the title and children when open is true", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Settings">
        <p>Configure your account</p>
      </Modal>,
    );
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Configure your account")).toBeInTheDocument();
  });

  it("should call onClose when the backdrop is clicked", async () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Modal open={true} onClose={handleClose} title="Close Test">
        <p>content</p>
      </Modal>,
    );
    const backdrop = container.querySelector(".fixed.inset-0");
    expect(backdrop).not.toBeNull();
    if (backdrop) {
      await userEvent.click(backdrop);
    }
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it("should not call onClose when clicking inside the modal panel", async () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Panel Test">
        <button>Inside button</button>
      </Modal>,
    );
    await userEvent.click(screen.getByText("Inside button"));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("should apply the default maxWidth class when none is provided", () => {
    const { container } = render(
      <Modal open={true} onClose={vi.fn()} title="Width Test">
        <p>content</p>
      </Modal>,
    );
    const panel = container.querySelector(".max-w-lg");
    expect(panel).toBeInTheDocument();
  });

  it("should apply a custom maxWidth class when provided", () => {
    const { container } = render(
      <Modal open={true} onClose={vi.fn()} title="Custom Width" maxWidth="max-w-2xl">
        <p>content</p>
      </Modal>,
    );
    const panel = container.querySelector(".max-w-2xl");
    expect(panel).toBeInTheDocument();
  });
});
