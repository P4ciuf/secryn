import { Link } from "react-router";
import { Plus, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

/** Props for the {@link PageHeader} component. */
interface PageHeaderProps {
  /** Main heading shown on the left. */
  title: string;
  /** Optional subtitle rendered below the heading. */
  subtitle?: string;
  /** Label for the primary action button (omitting this hides the button). */
  actionLabel?: string;
  /** Callback fired when the primary action button is clicked. */
  onAction?: () => void;
  /** Optional back-navigation link shown above the heading. */
  backTo?: { label: string; to: string };
}

/**
 * Consistent page-level heading with an optional back link,
 * subtitle, and primary action button.
 */
export function PageHeader({ title, subtitle, actionLabel, onAction, backTo }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {backTo && (
        <Link
          to={backTo.to}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backTo.label}</span>
        </Link>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          {subtitle && <p className="text-slate-400">{subtitle}</p>}
        </div>
        {actionLabel && onAction && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAction}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{actionLabel}</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
