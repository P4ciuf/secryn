import { Key, Calendar, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { SecretValue } from "../../../components/common/SecretValue";
import type { ApiKey } from "@repo/shared";

interface ApiKeyRowProps {
  apiKey: ApiKey;
  index: number;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

/**
 * Single row in the API Keys table rendering the key name, masked/plain
 * value, permission badges, last-used date, and a delete action.
 */
export function ApiKeyRow({
  apiKey,
  index,
  isVisible,
  onToggleVisibility,
  onDelete,
}: ApiKeyRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1 }}
      className="hover:bg-slate-900/30 transition-colors"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          <span className="font-medium">{apiKey.name}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <SecretValue
          value={apiKey.key}
          isVisible={isVisible}
          onToggle={onToggleVisibility}
          /** Keep the `sv_` prefix visible so users can identify the key type. */
          maskedPrefix="sv_"
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          {apiKey.permissions.map((perm) => (
            <span
              key={perm}
              className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs font-medium"
            >
              {perm}
            </span>
          ))}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Calendar className="w-4 h-4" />
          <span>{apiKey.lastUsed}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end">
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
