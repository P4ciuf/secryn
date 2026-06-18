import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  /** Icon component from lucide-react. */
  icon: LucideIcon;
  /** Heading displayed below the icon. */
  title: string;
  /** Supporting text below the heading. */
  description: string;
  /** Optional CTA button rendered below the description. */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Centered placeholder shown when a list is empty. Renders an icon, heading,
 * description, and an optional action button.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-slate-600 mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
