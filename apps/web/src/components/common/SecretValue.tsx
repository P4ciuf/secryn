import { Eye, EyeOff, Copy } from "lucide-react";
import { useClipboard } from "../../hooks/use-clipboard";

/** Props for the {@link SecretValue} component. */
interface SecretValueProps {
  /** The secret string to display or mask. */
  value: string;
  /** When `true` the plain-text value is shown; otherwise a masked placeholder is rendered. */
  isVisible: boolean;
  /** Toggles between visible and masked state. */
  onToggle: () => void;
  /** Prefix shown before the masked dots (defaults to "••"). */
  maskedPrefix?: string;
}

/**
 * Displays a secret value with inline show/hide and copy controls.
 * When masked, renders a fixed-width placeholder so the layout doesn't shift.
 */
export function SecretValue({ value, isVisible, onToggle, maskedPrefix = "••" }: SecretValueProps) {
  const { copyToClipboard } = useClipboard();

  return (
    <div className="font-mono text-sm max-w-md flex items-center gap-2">
      {isVisible ? (
        <span className="break-all">{value}</span>
      ) : (
        // Fixed-length mask ensures consistent layout regardless of the actual value length
        <span>{maskedPrefix}••••••••••••••••••••••••••••••••••••</span>
      )}
      <button
        onClick={onToggle}
        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
        title={isVisible ? "Hide" : "Show"}
      >
        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      <button
        onClick={() => copyToClipboard(value)}
        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
        title="Copy"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
}
