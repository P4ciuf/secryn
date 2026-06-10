import { AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { EmptyState } from "../../../components/common/EmptyState";
import { SecretRow } from "./SecretRow";
import type { Secret } from "@repo/shared";

interface SecretsTableProps {
  /** Array of secrets to display. An empty array triggers the empty state. */
  secrets: Secret[];
  /** Set of secret IDs whose values are currently visible in plain text. */
  visibleSet: Set<string>;
  /** Callback to toggle the visibility of the secret identified by the given ID. */
  onToggleVisibility: (id: string) => void;
  /** Callback to delete the secret identified by the given ID. */
  onDelete: (id: string) => void;
  /** Callback invoked with the full secret object when editing is requested. */
  onEdit: (secret: Secret) => void;
  /** Current search query used to filter secrets by name. */
  searchQuery: string;
  /** Called whenever the user types in the search input. */
  onSearchChange: (query: string) => void;
  /** When true, secrets exist but none match the current search query. */
  hasNoMatches: boolean;
  /** Total count of secrets before filtering (used for the search placeholder). */
  totalCount: number;
}

/**
 * Renders a table of secrets with an inline search bar, animated rows,
 * and contextual empty-state placeholders.
 */
export function SecretsTable({
  secrets,
  visibleSet,
  onToggleVisibility,
  onDelete,
  onEdit,
  searchQuery,
  onSearchChange,
  totalCount,
}: SecretsTableProps) {
  const emptyMessage =
    totalCount === 0
      ? 'No secrets yet. Click "Add Secret" to create one.'
      : "No secrets match your search.";

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {totalCount > 0 && (
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search secrets by name..."
              className="w-full pl-10 pr-10 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Value</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Last Updated</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            <AnimatePresence>
              {secrets.length === 0 ? (
                <EmptyState message={emptyMessage} />
              ) : (
                secrets.map((secret, index) => (
                  <SecretRow
                    key={secret.id}
                    secret={secret}
                    index={index}
                    isVisible={visibleSet.has(secret.id)}
                    onToggleVisibility={() => onToggleVisibility(secret.id)}
                    onDelete={() => onDelete(secret.id)}
                    onEdit={() => onEdit(secret)}
                  />
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
