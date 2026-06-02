/** Props for the {@link EmptyState} table row placeholder. */
interface EmptyStateProps {
  message: string;
}

/**
 * Renders a full-width table row with a centred message,
 * used when a table has no data to display.
 */
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <tr>
      {/* colSpan is deliberately large to span all possible columns */}
      <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
        {message}
      </td>
    </tr>
  );
}
