import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

describe("<EmptyState />", () => {
  it("should render the message text", () => {
    render(
      <table>
        <tbody>
          <EmptyState message="No items to display" />
        </tbody>
      </table>,
    );
    expect(screen.getByText("No items to display")).toBeInTheDocument();
  });

  it("should render inside a table row element", () => {
    render(
      <table>
        <tbody>
          <EmptyState message="Empty" />
        </tbody>
      </table>,
    );
    const cell = screen.getByText("Empty");
    expect(cell.tagName).toBe("TD");
    expect(cell.closest("tr")).toBeInTheDocument();
  });

  it("should render an empty td cell when the message is empty", () => {
    const { container } = render(
      <table>
        <tbody>
          <EmptyState message="" />
        </tbody>
      </table>,
    );
    const cell = container.querySelector("td");
    expect(cell).toBeInTheDocument();
    expect(cell?.textContent).toBe("");
  });
});
