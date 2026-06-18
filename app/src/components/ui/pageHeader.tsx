import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Page heading. */
  title: string;
  /** Optional subtitle rendered below the heading. */
  description?: string;
  /** Optional action slot (e.g. a button) rendered on the right. */
  action?: ReactNode;
}

/**
 * Consistent page header with a title, optional description, and an optional
 * action area aligned to the right.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">{title}</h1>
        {description && <p className="text-slate-400 text-sm">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
