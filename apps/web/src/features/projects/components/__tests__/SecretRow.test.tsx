import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecretRow } from "@/features/projects/components/SecretRow";
import type { Secret } from "@repo/shared";

vi.mock("@/hooks/use-clipboard", () => ({
  useClipboard: () => ({
    copied: false,
    copyToClipboard: vi.fn(),
  }),
}));

const mockSecret: Secret = {
  id: "s1",
  name: "DISCORD_TOKEN",
  value: "secret-value-123",
  updatedAt: "2026-06-01",
};

describe("<SecretRow />", () => {
  it("should render the secret name", () => {
    render(
      <table>
        <tbody>
          <SecretRow
            secret={mockSecret}
            index={0}
            isVisible={false}
            onToggleVisibility={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("DISCORD_TOKEN")).toBeInTheDocument();
  });

  it("should render the masked value when not visible", () => {
    render(
      <table>
        <tbody>
          <SecretRow
            secret={mockSecret}
            index={0}
            isVisible={false}
            onToggleVisibility={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByText("secret-value-123")).not.toBeInTheDocument();
  });

  it("should render the real value when visible", () => {
    render(
      <table>
        <tbody>
          <SecretRow
            secret={mockSecret}
            index={0}
            isVisible={true}
            onToggleVisibility={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("secret-value-123")).toBeInTheDocument();
  });

  it("should call onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <SecretRow
            secret={mockSecret}
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

  it("should call onToggleVisibility when toggle button is clicked", async () => {
    const onToggleVisibility = vi.fn();
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <SecretRow
            secret={mockSecret}
            index={0}
            isVisible={false}
            onToggleVisibility={onToggleVisibility}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    );

    const toggleButton = screen.getByRole("button", { name: "Show" });
    await user.click(toggleButton);
    expect(onToggleVisibility).toHaveBeenCalledTimes(1);
  });
});
