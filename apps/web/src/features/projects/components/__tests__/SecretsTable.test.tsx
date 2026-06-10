import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SecretsTable } from "@/features/projects/components/SecretsTable";
import type { Secret } from "@repo/shared";

vi.mock("@/hooks/use-clipboard", () => ({
  useClipboard: () => ({
    copied: false,
    copyToClipboard: vi.fn(),
  }),
}));

vi.mock("@/components/common/SecretValue", () => ({
  SecretValue: ({
    value,
    isVisible,
    onToggle,
  }: {
    value: string;
    isVisible: boolean;
    onToggle: () => void;
  }) => (
    <div>
      <span data-testid="secret-value">{isVisible ? value : "••••••••"}</span>
      <button onClick={onToggle}>{isVisible ? "Hide" : "Show"}</button>
    </div>
  ),
}));

const mockSecrets: Secret[] = [
  { id: "s1", name: "DISCORD_TOKEN", value: "abc", updatedAt: "2026-06-01" },
  { id: "s2", name: "STRIPE_KEY", value: "xyz", updatedAt: "2026-05-30" },
];

const defaultProps = {
  visibleSet: new Set<string>(),
  onToggleVisibility: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  searchQuery: "",
  onSearchChange: vi.fn(),
  hasNoMatches: false,
  totalCount: 0,
};

describe("<SecretsTable />", () => {
  it("should render table headers", () => {
    render(
      <SecretsTable {...defaultProps} secrets={mockSecrets} totalCount={mockSecrets.length} />,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("Last Updated")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("should render each secret as a row", () => {
    render(
      <SecretsTable {...defaultProps} secrets={mockSecrets} totalCount={mockSecrets.length} />,
    );

    expect(screen.getByText("DISCORD_TOKEN")).toBeInTheDocument();
    expect(screen.getByText("STRIPE_KEY")).toBeInTheDocument();
  });

  it("should show EmptyState when no secrets exist", () => {
    render(<SecretsTable {...defaultProps} secrets={[]} totalCount={0} />);

    expect(
      screen.getByText('No secrets yet. Click "Add Secret" to create one.'),
    ).toBeInTheDocument();
  });

  it("should show EmptyState with match message when searching yields nothing", () => {
    render(
      <SecretsTable
        {...defaultProps}
        secrets={[]}
        searchQuery="xyz"
        hasNoMatches={true}
        totalCount={2}
      />,
    );

    expect(screen.getByText("No secrets match your search.")).toBeInTheDocument();
  });

  it("should render search input when secrets exist", () => {
    render(
      <SecretsTable {...defaultProps} secrets={mockSecrets} totalCount={mockSecrets.length} />,
    );

    expect(screen.getByPlaceholderText("Search secrets by name...")).toBeInTheDocument();
  });

  it("should not render search input when no secrets exist yet", () => {
    render(<SecretsTable {...defaultProps} secrets={[]} totalCount={0} />);

    expect(screen.queryByPlaceholderText("Search secrets by name...")).not.toBeInTheDocument();
  });

  it("should call onSearchChange when typing in the search input", async () => {
    const user = userEvent.setup();

    function Wrapper() {
      const [query, setQuery] = useState("");
      return (
        <SecretsTable
          {...defaultProps}
          secrets={mockSecrets}
          searchQuery={query}
          onSearchChange={setQuery}
          totalCount={mockSecrets.length}
        />
      );
    }

    render(<Wrapper />);

    const input = screen.getByPlaceholderText("Search secrets by name...");
    await user.type(input, "DISCORD");

    expect(screen.getByPlaceholderText("Search secrets by name...")).toHaveValue("DISCORD");
  });

  it("should show clear button when search query is not empty", () => {
    render(
      <SecretsTable
        {...defaultProps}
        secrets={mockSecrets}
        searchQuery="token"
        totalCount={mockSecrets.length}
      />,
    );

    expect(screen.getByTitle("Clear search")).toBeInTheDocument();
  });

  it("should call onToggleVisibility with correct id", async () => {
    const onToggleVisibility = vi.fn();
    const user = userEvent.setup();

    render(
      <SecretsTable
        {...defaultProps}
        secrets={mockSecrets}
        onToggleVisibility={onToggleVisibility}
        totalCount={mockSecrets.length}
      />,
    );

    const toggleButtons = screen.getAllByRole("button", { name: "Show" });
    await user.click(toggleButtons[0]!);
    expect(onToggleVisibility).toHaveBeenCalledWith("s1");
  });

  it("should call onDelete with correct id", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <SecretsTable
        {...defaultProps}
        secrets={mockSecrets}
        onDelete={onDelete}
        totalCount={mockSecrets.length}
      />,
    );

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[0]!);
    expect(onDelete).toHaveBeenCalledWith("s1");
  });
});
