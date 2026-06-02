import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ApiKeysPage from "@/features/api-keys/ApiKeysPage";

vi.mock("@/__mocks__/framer-motion", async () => {
  const React = await import("react");
  const cache = new Map<string, React.FC<any>>();
  const motion = new Proxy(
    {},
    {
      get(_target: unknown, prop: string) {
        if (!cache.has(prop)) {
          cache.set(
            prop,
            React.forwardRef((props: any, ref: any) =>
              React.createElement(prop, { ...props, ref }),
            ),
          );
        }
        return cache.get(prop);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock("@/components/common/PageHeader", () => ({
  PageHeader: ({
    title,
    subtitle,
    actionLabel,
    onAction,
  }: {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <div data-testid="mock-page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actionLabel && (
        <button data-testid="header-action-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/features/api-keys/components/ApiKeyRow", () => ({
  ApiKeyRow: ({
    apiKey,
    onDelete,
  }: {
    apiKey: { id: string; name: string };
    onDelete: () => void;
  }) => (
    <tr data-testid={`apikey-row-${apiKey.id}`}>
      <td>{apiKey.name}</td>
      <td>
        <button data-testid={`delete-${apiKey.id}`} onClick={onDelete}>
          Delete
        </button>
      </td>
    </tr>
  ),
}));

vi.mock("@/features/api-keys/components/CreateApiKeyModal", () => ({
  CreateApiKeyModal: ({
    open,
    onClose,
    onSubmit,
  }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, permissions: string[]) => void;
  }) =>
    open ? (
      <div data-testid="mock-create-modal">
        <button data-testid="modal-close-btn" onClick={onClose}>
          Cancel
        </button>
        <button data-testid="modal-submit-btn" onClick={() => onSubmit("New Key", ["read"])}>
          Create
        </button>
      </div>
    ) : null,
}));

vi.mock("@/data/api-keys", () => ({
  mockApiKeys: [
    {
      id: "1",
      name: "Production API Key",
      key: "sv_prod_abc",
      createdAt: "2026-05-15",
      lastUsed: "2026-06-02",
      permissions: ["read", "write"] as const,
    },
  ],
}));

describe("ApiKeysPage", () => {
  it("should render the page header with title", () => {
    render(<ApiKeysPage />);
    expect(screen.getByText("API Keys")).toBeInTheDocument();
  });

  it("should render API key rows from mock data", () => {
    render(<ApiKeysPage />);
    expect(screen.getByTestId("apikey-row-1")).toBeInTheDocument();
  });

  it("should not show create modal by default", () => {
    render(<ApiKeysPage />);
    expect(screen.queryByTestId("mock-create-modal")).not.toBeInTheDocument();
  });

  it("should show create modal when action button is clicked", async () => {
    render(<ApiKeysPage />);
    fireEvent.click(screen.getByTestId("header-action-btn"));
    expect(screen.getByTestId("mock-create-modal")).toBeInTheDocument();
  });

  it("should add a new API key on submit", async () => {
    render(<ApiKeysPage />);
    fireEvent.click(screen.getByTestId("header-action-btn"));
    fireEvent.click(screen.getByTestId("modal-submit-btn"));
    expect(screen.queryByTestId("mock-create-modal")).not.toBeInTheDocument();
  });

  it("should remove an API key on delete", async () => {
    render(<ApiKeysPage />);
    fireEvent.click(screen.getByTestId("delete-1"));
    expect(screen.queryByTestId("apikey-row-1")).not.toBeInTheDocument();
  });
});
