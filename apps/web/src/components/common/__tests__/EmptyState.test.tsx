import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/common/EmptyState";

describe("<EmptyState />", () => {
  it("should render the message inside a table row", () => {
    render(
      <table>
        <tbody>
          <EmptyState message="No data found" />
        </tbody>
      </table>,
    );

    expect(screen.getByText("No data found")).toBeInTheDocument();
  });

  it("should render within a table row element", () => {
    render(
      <table>
        <tbody>
          <EmptyState message="Loading..." />
        </tbody>
      </table>,
    );

    const row = screen.getByRole("row");
    expect(row).toBeInTheDocument();
  });

  it("should render an empty message", () => {
    render(
      <table>
        <tbody>
          <EmptyState message="" />
        </tbody>
      </table>,
    );

    const row = screen.getByRole("row");
    expect(row).toBeInTheDocument();
  });

  it("should render the colSpan attribute", () => {
    render(
      <table>
        <tbody>
          <EmptyState message="Nothing here" />
        </tbody>
      </table>,
    );

    const cell = screen.getByText("Nothing here");
    expect(cell).toHaveAttribute("colspan", "10");
  });
});
