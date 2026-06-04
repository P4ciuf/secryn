import { Webhook as WebhookIcon, CheckCircle, XCircle, Activity, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Webhook } from "@repo/shared";

interface WebhookCardProps {
  webhook: Webhook;
  onDelete: () => void;
}

/**
 * Compact card displaying a webhook's URL, active/inactive status badge,
 * last-triggered timestamp, and subscribed event tags.
 */
export function WebhookCard({ webhook, onDelete }: WebhookCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: 0.1 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <WebhookIcon className="w-6 h-6 text-purple-400 mt-1" />
          <div>
            <code className="text-sm text-slate-300 break-all">{webhook.url}</code>
            <div className="flex items-center gap-2 mt-2">
              {webhook.status === "active" ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <XCircle className="w-3 h-3" />
                  Inactive
                </span>
              )}
              <span className="text-xs text-slate-500">•</span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Activity className="w-3 h-3" />
                Last: {webhook.lastTriggered}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {webhook.events.map((event) => (
          <span
            key={event}
            className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs font-medium"
          >
            {event}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
