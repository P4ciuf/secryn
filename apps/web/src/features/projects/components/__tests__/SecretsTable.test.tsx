import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecretsTable } from "@/features/projects/components/SecretsTable";
import type { Secret } from "@/types";

vi.mock("@/hooks/use-clipboard", () => ({
  useClipboard: () => ({
    copied: false,
    copyToClipboard: vi.fn(),
  }),
}));

vi.mock("@/components/common/SecretValue", () => ({
  SecretValue: ({ value, isVisible }: { value: string; isVisible: boolean }) => (
    <span data-testid="secret-value">{isVisible ? value : "••••••••"}</span>
  ),
}));

const mockSecrets: Secret[] = [
  { id: "s1", name: "DISCORD_TOKEN", value: "abc", updatedAt: "2026-06-01" },
  { id: "s2", name: "STRIPE_KEY", value: "xyz", updatedAt: "2026-05-30" },
];

describe("<SecretsTable />", () => {
  it("should render table headers", () => {
    render(
      <SecretsTable
        secrets={mockSecrets}
        visibleSet={new Set()}
        onToggleVisibility={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("Last Updated")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("should render each secret as a row", () => {
    render(
      <SecretsTable
        secrets={mockSecrets}
        visibleSet={new Set()}
        onToggleVisibility={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("DISCORD_TOKEN")).toBeInTheDocument();
    expect(screen.getByText("STRIPE_KEY")).toBeInTheDocument();
  });

  it("should show EmptyState when no secrets exist", () => {
    render(
      <SecretsTable
        secrets={[]}
        visibleSet={new Set()}
        onToggleVisibility={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByText('No secrets yet. Click "Add Secret" to create one.'),
    ).toBeInTheDocument();
  });

  it("should call onToggleVisibility with correct id", async () => {
    const onToggleVisibility = vi.fn();
    const user = userEvent.setup();

    render(
      <SecretsTable
        secrets={mockSecrets}
        visibleSet={new Set()}
        onToggleVisibility={onToggleVisibility}
        onDelete={vi.fn()}
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
        secrets={mockSecrets}
        visibleSet={new Set()}
        onToggleVisibility={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[0]!);
    expect(onDelete).toHaveBeenCalledWith("s1");
  });
});
