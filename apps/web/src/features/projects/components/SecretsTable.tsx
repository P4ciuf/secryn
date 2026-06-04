import { AnimatePresence } from "framer-motion";
import { EmptyState } from "../../../components/common/EmptyState";
import { SecretRow } from "./SecretRow";
import type { Secret } from "@repo/shared";

interface SecretsTableProps {
  secrets: Secret[];
  /** Set of secret IDs whose values are currently visible in plain text. */
  visibleSet: Set<string>;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Renders a table of secrets with animated rows and an empty-state
 * placeholder when the list is empty.
 */
export function SecretsTable({
  secrets,
  visibleSet,
  onToggleVisibility,
  onDelete,
}: SecretsTableProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
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
                <EmptyState message='No secrets yet. Click "Add Secret" to create one.' />
              ) : (
                secrets.map((secret, index) => (
                  <SecretRow
                    key={secret.id}
                    secret={secret}
                    index={index}
                    isVisible={visibleSet.has(secret.id)}
                    onToggleVisibility={() => onToggleVisibility(secret.id)}
                    onDelete={() => onDelete(secret.id)}
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
