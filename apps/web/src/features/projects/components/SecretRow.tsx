import { Key, Calendar, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { SecretValue } from "../../../components/common/SecretValue";
import type { Secret } from "../../../types";

interface SecretRowProps {
  secret: Secret;
  index: number;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

/**
 * Single row in the secrets table rendering the name, masked/plain value,
 * last-updated date, and a delete action.
 */
export function SecretRow({
  secret,
  index,
  isVisible,
  onToggleVisibility,
  onDelete,
}: SecretRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="hover:bg-slate-900/30 transition-colors"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          <span className="font-mono">{secret.name}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <SecretValue value={secret.value} isVisible={isVisible} onToggle={onToggleVisibility} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Calendar className="w-4 h-4" />
          <span>{new Date(secret.updatedAt).toLocaleDateString()}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}
