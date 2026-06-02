import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "../../components/common/PageHeader";
import { WebhookCard } from "../../features/webhooks/components/WebhookCard";
import { CreateWebhookModal } from "../../features/webhooks/components/CreateWebhookModal";
import { mockWebhooks } from "../../data/webhooks";
import type { Webhook, WebhookEvent } from "../../types";

/**
 * Webhooks management page.
 *
 * Lists registered webhooks with status, last trigger time, and event tags.
 * Includes a modal for registering new webhook endpoints.
 */
export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>(mockWebhooks);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const deleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  /** Creates a mock webhook entry and appends it to local state. */
  const handleCreate = (url: string, events: WebhookEvent[]) => {
    const newWebhook: Webhook = {
      id: `${Date.now()}`,
      url,
      events,
      status: "active",
      lastTriggered: "Never",
    };
    setWebhooks((prev) => [...prev, newWebhook]);
    setShowCreateModal(false);
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

      <div className="space-y-4">
        <AnimatePresence>
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onDelete={() => deleteWebhook(webhook.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <CreateWebhookModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />
    </motion.div>
  );
}
