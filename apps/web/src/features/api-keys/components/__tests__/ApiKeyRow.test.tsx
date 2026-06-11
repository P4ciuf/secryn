import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeyRow } from "@/features/api-keys/components/ApiKeyRow";
import type { ApiKey } from "@repo/shared";

vi.mock("@/hooks/use-clipboard", () => ({
  useClipboard: () => ({
    copied: false,
    copyToClipboard: vi.fn(),
  }),
}));

const mockApiKey: ApiKey = {
  id: "1",
  keyName: "Production API Key",
  key: "sv_prod_abc123def456",
  userId: "user-1",
  isActive: true,
  createdAt: "2026-05-15T10:00:00.000Z",
  updatedAt: "2026-06-02T08:30:00.000Z",
  expiresAt: "2026-08-15T10:00:00.000Z",
  permissions: ["read", "write"],
};

describe("<ApiKeyRow />", () => {
  it("should render the API key name", () => {
    render(
      <table>
        <tbody>
          <ApiKeyRow
            apiKey={mockApiKey}
            index={0}
            isVisible={false}
            onToggleVisibility={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("Production API Key")).toBeInTheDocument();
  });

  it("should render the masked key when not visible", () => {
    render(
      <table>
        <tbody>
          <ApiKeyRow
            apiKey={mockApiKey}
            index={0}
            isVisible={false}
            onToggleVisibility={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByText("sv_prod_abc123def456")).not.toBeInTheDocument();
  });

  it("should render the real key when visible", () => {
    render(
      <table>
        <tbody>
          <ApiKeyRow
            apiKey={mockApiKey}
            index={0}
            isVisible={true}
            onToggleVisibility={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("sv_prod_abc123def456")).toBeInTheDocument();
  });

  it("should render permission badges", () => {
    render(
      <table>
        <tbody>
          <ApiKeyRow
            apiKey={mockApiKey}
            index={0}
            isVisible={false}
            onToggleVisibility={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("read")).toBeInTheDocument();
    expect(screen.getByText("write")).toBeInTheDocument();
  });

  it("should render the expiresAt date", () => {
    render(
      <table>
        <tbody>
          <ApiKeyRow
            apiKey={mockApiKey}
            index={0}
            isVisible={false}
            onToggleVisibility={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("2026-08-15T10:00:00.000Z")).toBeInTheDocument();
  });

  it("should call onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <ApiKeyRow
            apiKey={mockApiKey}
            index={0}
            isVisible={false}
            onToggleVisibility={vi.fn()}
            onDelete={onDelete}
          />
        </tbody>
      </table>,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
