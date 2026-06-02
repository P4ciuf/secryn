import { useCallback, useRef, useState } from "react";

/**
 * Hook that copies text to the system clipboard and exposes a transient "copied" state.
 * The copied indicator resets automatically after 2 seconds.
 */
export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const copyToClipboard = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  return { copied, copyToClipboard };
}
