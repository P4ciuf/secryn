import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToggleVisibility } from "@/hooks/use-toggle-visibility";

describe("useToggleVisibility hook", () => {
  it("should return an empty visibleSet by default", () => {
    const { result } = renderHook(() => useToggleVisibility());
    expect(result.current.visibleSet.size).toBe(0);
  });

  it("should add an id to visibleSet when toggled", () => {
    const { result } = renderHook(() => useToggleVisibility());

    act(() => {
      result.current.toggle("secret-1");
    });

    expect(result.current.isVisible("secret-1")).toBe(true);
    expect(result.current.visibleSet.size).toBe(1);
  });

  it("should remove an id from visibleSet when toggled again", () => {
    const { result } = renderHook(() => useToggleVisibility());

    act(() => {
      result.current.toggle("secret-1");
    });
    expect(result.current.isVisible("secret-1")).toBe(true);

    act(() => {
      result.current.toggle("secret-1");
    });
    expect(result.current.isVisible("secret-1")).toBe(false);
    expect(result.current.visibleSet.size).toBe(0);
  });

  it("should handle multiple independent ids", () => {
    const { result } = renderHook(() => useToggleVisibility());

    act(() => {
      result.current.toggle("secret-1");
    });
    act(() => {
      result.current.toggle("secret-2");
    });

    expect(result.current.isVisible("secret-1")).toBe(true);
    expect(result.current.isVisible("secret-2")).toBe(true);
    expect(result.current.visibleSet.size).toBe(2);

    act(() => {
      result.current.toggle("secret-1");
    });

    expect(result.current.isVisible("secret-1")).toBe(false);
    expect(result.current.isVisible("secret-2")).toBe(true);
    expect(result.current.visibleSet.size).toBe(1);
  });

  it("should return false for isVisible on an untracked id", () => {
    const { result } = renderHook(() => useToggleVisibility());

    expect(result.current.isVisible("nonexistent")).toBe(false);
  });
});
