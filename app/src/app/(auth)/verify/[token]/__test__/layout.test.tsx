import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VerifyLayout, { metadata } from "../layout";

describe("VerifyLayout", () => {
  it("renders children transparently", () => {
    render(
      <VerifyLayout>
        <span data-testid="child">Verification result</span>
      </VerifyLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Verification result")).toBeInTheDocument();
  });

  it("exports metadata with noindex nofollow robots directives", () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Verify Account");
    expect(metadata.robots).toBeDefined();
    expect(metadata.robots!.index).toBe(false);
    expect(metadata.robots!.follow).toBe(false);
    expect(metadata.robots!.googleBot).toBeDefined();
    expect(metadata.robots!.googleBot!.index).toBe(false);
    expect(metadata.robots!.googleBot!.follow).toBe(false);
  });
});
