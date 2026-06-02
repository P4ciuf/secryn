import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProjectModal } from "@/features/projects/components/CreateProjectModal";

vi.mock("@/components/common/Modal", () => ({
  Modal: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="mock-modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

describe("<CreateProjectModal />", () => {
  it("should not render when open is false", () => {
    const onClose = vi.fn();
    render(<CreateProjectModal open={false} onClose={onClose} />);
    expect(screen.queryByTestId("mock-modal")).not.toBeInTheDocument();
  });

  it("should render when open is true", () => {
    const onClose = vi.fn();
    render(<CreateProjectModal open={true} onClose={onClose} />);
    expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
    expect(screen.getByText("Create New Project")).toBeInTheDocument();
  });

  it("should render project name and description fields", () => {
    const onClose = vi.fn();
    render(<CreateProjectModal open={true} onClose={onClose} />);

    expect(screen.getByPlaceholderText("My Project")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Project description...")).toBeInTheDocument();
  });

  it("should render Create and Cancel buttons", () => {
    const onClose = vi.fn();
    render(<CreateProjectModal open={true} onClose={onClose} />);

    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CreateProjectModal open={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose on form submit", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CreateProjectModal open={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
