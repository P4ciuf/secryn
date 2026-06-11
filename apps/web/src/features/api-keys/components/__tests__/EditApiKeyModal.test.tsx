import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditApiKeyModal } from "@/features/api-keys/components/EditApiKeyModal";
import type { ApiKey, ApiKeyPermission } from "@repo/shared";

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

const mockApiKey: ApiKey = {
  id: "key_001",
  keyName: "My API Key",
  key: "sc_test",
  userId: "user_001",
  isActive: true,
  permissions: ["read"] as ApiKeyPermission[],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  expiresAt: "2024-02-01T00:00:00.000Z",
};

describe("<EditApiKeyModal />", () => {
  it("renders when open with apiKey data", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(
      <EditApiKeyModal open={true} apiKey={mockApiKey} onClose={onClose} onSubmit={onSubmit} />,
    );

    expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
    expect(screen.getByText("Edit API Key")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("My API Key")).toHaveValue("My API Key");
  });

  it("does not render when open is false", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(
      <EditApiKeyModal open={false} apiKey={mockApiKey} onClose={onClose} onSubmit={onSubmit} />,
    );

    expect(screen.queryByTestId("mock-modal")).not.toBeInTheDocument();
  });

  it('shows "read" permission checked from apiKey.permissions', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(
      <EditApiKeyModal open={true} apiKey={mockApiKey} onClose={onClose} onSubmit={onSubmit} />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it("toggles permissions on click", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <EditApiKeyModal open={true} apiKey={mockApiKey} onClose={onClose} onSubmit={onSubmit} />,
    );

    const checkboxes = screen.getAllByRole("checkbox");

    await user.click(checkboxes[2]!);
    expect(checkboxes[2]).toBeChecked();

    await user.click(checkboxes[1]!);
    expect(checkboxes[1]).not.toBeChecked();
  });

  it("calls onSubmit with correct data when saving", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <EditApiKeyModal open={true} apiKey={mockApiKey} onClose={onClose} onSubmit={onSubmit} />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[2]!);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith("key_001", {
      addPermissions: ["write"],
      removePermissions: undefined,
      name: undefined,
      isActive: undefined,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when cancel button clicked", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <EditApiKeyModal open={true} apiKey={mockApiKey} onClose={onClose} onSubmit={onSubmit} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("resets form fields when apiKey prop changes", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    const { rerender } = render(
      <EditApiKeyModal open={true} apiKey={mockApiKey} onClose={onClose} onSubmit={onSubmit} />,
    );

    expect(screen.getByPlaceholderText("My API Key")).toHaveValue("My API Key");

    const updatedApiKey: ApiKey = {
      ...mockApiKey,
      keyName: "Updated Key",
      isActive: false,
      permissions: ["read", "write"] as ApiKeyPermission[],
    };

    rerender(
      <EditApiKeyModal open={true} apiKey={updatedApiKey} onClose={onClose} onSubmit={onSubmit} />,
    );

    expect(screen.getByPlaceholderText("My API Key")).toHaveValue("Updated Key");

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });
});
