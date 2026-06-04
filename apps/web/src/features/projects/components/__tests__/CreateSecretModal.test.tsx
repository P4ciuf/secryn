import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateSecretModal } from "@/features/projects/components/CreateSecretModal";

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

describe("<CreateSecretModal />", () => {
  it("should not render when open is false", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateSecretModal open={false} onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.queryByTestId("mock-modal")).not.toBeInTheDocument();
  });

  it("should render when open is true", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateSecretModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
    expect(screen.getByText("Add New Secret")).toBeInTheDocument();
  });

  it("should render Secret Name and Secret Value fields", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateSecretModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByPlaceholderText("API_KEY")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("your-secret-value-here")).toBeInTheDocument();
  });

  it("should call onSubmit with entered values", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CreateSecretModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("API_KEY"), {
      target: { value: "MY_KEY" },
    });
    fireEvent.change(screen.getByPlaceholderText("your-secret-value-here"), {
      target: { value: "my-secret" },
    });
    await user.click(screen.getByRole("button", { name: "Add Secret" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "MY_KEY", value: "my-secret" });
  });

  it("should clear fields after submit", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CreateSecretModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("API_KEY"), {
      target: { value: "MY_KEY" },
    });
    fireEvent.change(screen.getByPlaceholderText("your-secret-value-here"), {
      target: { value: "my-secret" },
    });
    await user.click(screen.getByRole("button", { name: "Add Secret" }));

    expect(screen.getByPlaceholderText("API_KEY")).toHaveValue("");
    expect(screen.getByPlaceholderText("your-secret-value-here")).toHaveValue("");
  });

  it("should call onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CreateSecretModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
