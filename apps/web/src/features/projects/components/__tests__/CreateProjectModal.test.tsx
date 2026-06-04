import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProjectModal } from "../CreateProjectModal";
import type { CreateProjectInput } from "@repo/shared";

describe("<CreateProjectModal />", () => {
  it("does not render when open is false", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateProjectModal open={false} onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.queryByText("Create New Project")).not.toBeInTheDocument();
  });

  it("renders when open is true", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.getByText("Create New Project")).toBeInTheDocument();
  });

  it("renders project name and description inputs", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.getByPlaceholderText("My Project")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Project description...")).toBeInTheDocument();
  });

  it("renders Create and Cancel buttons", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onClose when Cancel button is clicked", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with correct input data when form is submitted", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("My Project"), {
        target: { value: "My New Project" },
      });
      fireEvent.change(screen.getByPlaceholderText("Project description..."), {
        target: { value: "This is a test project" },
      });
    });

    await user.click(screen.getByRole("button", { name: "Create" }));

    const expectedInput: CreateProjectInput = {
      name: "My New Project",
      description: "This is a test project",
    };
    expect(onSubmit).toHaveBeenCalledWith(expectedInput);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("resets form fields after submit", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("My Project"), {
        target: { value: "My New Project" },
      });
      fireEvent.change(screen.getByPlaceholderText("Project description..."), {
        target: { value: "Description text" },
      });
    });

    expect(screen.getByPlaceholderText("My Project")).toHaveValue("My New Project");
    expect(screen.getByPlaceholderText("Project description...")).toHaveValue("Description text");

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByPlaceholderText("My Project")).toHaveValue("");
    expect(screen.getByPlaceholderText("Project description...")).toHaveValue("");
  });

  it("resets form fields when modal is closed via Cancel", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />,
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("My Project"), {
        target: { value: "Some Project" },
      });
      fireEvent.change(screen.getByPlaceholderText("Project description..."), {
        target: { value: "Some description" },
      });
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByPlaceholderText("My Project")).toHaveValue("");
    expect(screen.getByPlaceholderText("Project description...")).toHaveValue("");
  });

  it("submits with empty description when not filled in", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("My Project"), {
        target: { value: "Name Only" },
      });
    });

    await user.click(screen.getByRole("button", { name: "Create" }));

    const expectedInput: CreateProjectInput = {
      name: "Name Only",
      description: "",
    };
    expect(onSubmit).toHaveBeenCalledWith(expectedInput);
  });

  it("renders label text for both inputs", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByText("Project Name")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });
});
