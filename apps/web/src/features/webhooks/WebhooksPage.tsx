import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "../../components/common/PageHeader";
import { WebhookCard } from "../../features/webhooks/components/WebhookCard";
import { CreateWebhookModal } from "../../features/webhooks/components/CreateWebhookModal";
import { api } from "../../lib/api";
import type { CreateWebhookInput, Webhook } from "@repo/shared";

/**
 * Webhooks management page.
 *
 * Fetches registered webhooks from {@code GET /webhooks} on mount and
 * supports registering new endpoints and deleting existing ones. Each
 * mutation sets an error banner on failure without blocking the UI.
 */
export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await api.get<Webhook[]>("/webhooks");
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const deleteWebhook = async (id: string) => {
    try {
      await api.delete<void>(`/webhooks/${id}`);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete webhook");
    }
  };

  const handleCreate = async (input: CreateWebhookInput) => {
    try {
      const created = await api.post<Webhook, CreateWebhookInput>("/webhooks", input);
      setWebhooks((prev) => [...prev, created]);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader
        title="Webhooks"
        subtitle="Receive real-time notifications for events in your vault"
        actionLabel="Add Webhook"
        onAction={() => setShowCreateModal(true)}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-1/4 mb-4" />
            <div className="h-4 bg-slate-700 rounded w-3/4" />
          </div>
        ) : (
          <AnimatePresence>
            {webhooks.map((webhook) => (
              <WebhookCard
                key={webhook.id}
                webhook={webhook}
                onDelete={() => deleteWebhook(webhook.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <CreateWebhookModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />
    </motion.div>
  );
}
