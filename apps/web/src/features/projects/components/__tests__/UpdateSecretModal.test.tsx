import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateSecretModal } from "@/features/projects/components/UpdateSecretModal";
import type { Secret } from "@repo/shared";

vi.mock("@/components/common/Modal", () => ({
  Modal: ({
    open,
    onClose,
    title,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

const now = new Date().toISOString();

const mockSecret: Secret = {
  id: "sec_abc123",
  name: "DATABASE_URL",
  value: "postgresql://localhost:5432/mydb",
  notes: "Main database connection",
  projectId: "proj_001",
  addedById: "user_001",
  updatedById: "user_001",
  createdAt: now,
  updatedAt: now,
};

describe("<UpdateSecretModal />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render nothing when open is false", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(
      <UpdateSecretModal open={false} onClose={onClose} onSubmit={onSubmit} secret={mockSecret} />,
    );

    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("should render the modal with title and pre-populated fields when open", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(<UpdateSecretModal open onClose={onClose} onSubmit={onSubmit} secret={mockSecret} />);

    expect(screen.getByRole("heading", { name: "Update Secret" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("DATABASE_URL")).toBeInTheDocument();
    expect(screen.getByDisplayValue("postgresql://localhost:5432/mydb")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Main database connection")).toBeInTheDocument();
  });

  it("should render Cancel and Update Secret buttons", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(<UpdateSecretModal open onClose={onClose} onSubmit={onSubmit} secret={mockSecret} />);

    expect(screen.getByRole("button", { name: "Update Secret" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("should call onSubmit with updated fields and close the modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(<UpdateSecretModal open onClose={onClose} onSubmit={onSubmit} secret={mockSecret} />);

    const nameInput = screen.getByPlaceholderText("API_KEY");
    await user.clear(nameInput);
    await user.type(nameInput, "NEW_DB_URL");

    await user.click(screen.getByRole("button", { name: "Update Secret" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({
      id: "sec_abc123",
      name: "NEW_DB_URL",
      value: "postgresql://localhost:5432/mydb",
      notes: "Main database connection",
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should coerce empty fields to undefined in payload", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(<UpdateSecretModal open onClose={onClose} onSubmit={onSubmit} secret={mockSecret} />);

    const nameInput = screen.getByPlaceholderText("API_KEY");
    await user.clear(nameInput);

    await user.click(screen.getByRole("button", { name: "Update Secret" }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: "sec_abc123",
      name: undefined,
      value: "postgresql://localhost:5432/mydb",
      notes: "Main database connection",
    });
  });

  it("should call onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(<UpdateSecretModal open onClose={onClose} onSubmit={onSubmit} secret={mockSecret} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should populate only changed fields in the payload", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(<UpdateSecretModal open onClose={onClose} onSubmit={onSubmit} secret={mockSecret} />);

    const valueTextarea = screen.getByDisplayValue("postgresql://localhost:5432/mydb");
    await user.clear(valueTextarea);
    await user.type(valueTextarea, "postgresql://prod:5432/mydb");

    await user.click(screen.getByRole("button", { name: "Update Secret" }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: "sec_abc123",
      name: "DATABASE_URL",
      value: "postgresql://prod:5432/mydb",
      notes: "Main database connection",
    });
  });
});
