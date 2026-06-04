import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateApiKeyModal } from "@/features/api-keys/components/CreateApiKeyModal";

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

describe("<CreateApiKeyModal />", () => {
  it("should render when open is true", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateApiKeyModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
    expect(screen.getByText("Create New API Key")).toBeInTheDocument();
  });

  it("should render key name input and permission checkboxes", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateApiKeyModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByPlaceholderText("My API Key")).toBeInTheDocument();
    expect(screen.getByText("read")).toBeInTheDocument();
    expect(screen.getByText("write")).toBeInTheDocument();
  });

  it("should have 'read' permission checked by default", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateApiKeyModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    const checkboxes = screen.getAllByRole("checkbox");
    const readCheckbox = checkboxes[0]!;
    const writeCheckbox = checkboxes[1]!;

    expect(readCheckbox).toBeChecked();
    expect(writeCheckbox).not.toBeChecked();
  });

  it("should call onSubmit with name and permissions", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CreateApiKeyModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText("My API Key"), "My New Key");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "My New Key", permissions: ["read"] });
  });

  it("should toggle permissions on click", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CreateApiKeyModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    const checkboxes = screen.getAllByRole("checkbox");

    await user.click(checkboxes[1]!);
    expect(checkboxes[1]).toBeChecked();

    await user.click(checkboxes[0]!);
    expect(checkboxes[0]).not.toBeChecked();
  });
});
