import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClipboard } from "@/hooks/use-clipboard";

describe("useClipboard hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should return initial state with copied=false", () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.copied).toBe(false);
  });

  it("should set copied to true when copyToClipboard is called", async () => {
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      result.current.copyToClipboard("test-value");
      await navigator.clipboard.writeText("test-value");
    });

    expect(result.current.copied).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test-value");
  });

  it("should reset copied to false after 2 seconds", async () => {
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      result.current.copyToClipboard("test-value");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });

  it("should clear previous timer when copyToClipboard is called again within 2 seconds", async () => {
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      result.current.copyToClipboard("first");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      result.current.copyToClipboard("second");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });
});
