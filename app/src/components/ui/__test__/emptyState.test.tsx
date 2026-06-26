import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "../emptyState";

function MockIcon({ className }: { className?: string }) {
  return <span data-testid="mock-icon" className={className} />;
}

describe("EmptyState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the icon, title, and description", () => {
    render(<EmptyState icon={MockIcon} title="No items" description="Nothing to see here." />);

    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No items" })).toBeInTheDocument();
    expect(screen.getByText("Nothing to see here.")).toBeInTheDocument();
  });

  it("renders without an action button", () => {
    render(<EmptyState icon={MockIcon} title="No items" description="Nothing to see here." />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders an action button when provided", () => {
    const onClick = vi.fn();

    render(
      <EmptyState
        icon={MockIcon}
        title="No items"
        description="Nothing to see here."
        action={{ label: "Add item", onClick }}
      />,
    );

    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("calls the action onClick when the button is clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        icon={MockIcon}
        title="No items"
        description="Nothing to see here."
        action={{ label: "Add item", onClick }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
