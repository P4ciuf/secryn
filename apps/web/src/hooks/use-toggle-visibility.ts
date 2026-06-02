import { useCallback, useState } from "react";

/**
 * Hook that manages a set of visible item IDs, providing toggle and check helpers.
 * Useful for expandable lists, accordion sections, or password visibility toggles.
 */
export function useToggleVisibility() {
  const [visibleSet, setVisibleSet] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setVisibleSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isVisible = useCallback((id: string) => visibleSet.has(id), [visibleSet]);

  return { isVisible, toggle, visibleSet };
}
