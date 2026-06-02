import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "../../components/common/PageHeader";
import { ApiKeyRow } from "../../features/api-keys/components/ApiKeyRow";
import { CreateApiKeyModal } from "../../features/api-keys/components/CreateApiKeyModal";
import { mockApiKeys } from "../../data/api-keys";
import type { ApiKey, ApiKeyPermission } from "../../types";

/**
 * API Keys management page.
 *
 * Displays a table of existing keys with toggle-visibility and delete
 * actions, plus a modal for creating new keys.
 */
export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [showCreateModal, setShowCreateModal] = useState(false);
  /** Tracks which key IDs have their full value revealed locally. */
  const [localVisible, setLocalVisible] = useState<Set<string>>(new Set());

  const toggleVisibility = (id: string) => {
    setLocalVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  /** Generates a mock API key and appends it to local state. */
  const handleCreate = (name: string, permissions: ApiKeyPermission[]) => {
    const newKey: ApiKey = {
      id: `${Date.now()}`,
      name,
      key: `sv_${permissions.includes("write") ? "prod" : "dev"}_${Math.random().toString(36).substring(2, 50)}`,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      permissions,
    };
    setApiKeys((prev) => [...prev, newKey]);
    setShowCreateModal(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader
        title="API Keys"
        subtitle="Manage your API keys for programmatic access"
        actionLabel="Create API Key"
        onAction={() => setShowCreateModal(true)}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">API Key</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Permissions</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Last Used</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              <AnimatePresence>
                {apiKeys.map((apiKey, index) => (
                  <ApiKeyRow
                    key={apiKey.id}
                    apiKey={apiKey}
                    index={index}
                    isVisible={localVisible.has(apiKey.id)}
                    onToggleVisibility={() => toggleVisibility(apiKey.id)}
                    onDelete={() => deleteKey(apiKey.id)}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      <CreateApiKeyModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />
    </motion.div>
  );
}
