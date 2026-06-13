import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "../../components/common/PageHeader";
import { ApiKeyRow } from "../../features/api-keys/components/ApiKeyRow";
import { CreateApiKeyModal } from "../../features/api-keys/components/CreateApiKeyModal";
import { EditApiKeyModal } from "../../features/api-keys/components/EditApiKeyModal";
import { api } from "../../lib/api";
import type { ApiKey, ApiKeyPermission, CreateApiKeyInput, UpdateApiKeyInput } from "@repo/shared";

/**
 * API Keys management page.
 *
 * Fetches key list on mount from {@code GET /api-keys} and supports
 * creating new keys and deleting existing ones. Each operation sets an
 * error banner on failure rather than blocking the UI.
 */
export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  /** Tracks which key IDs have their full value revealed locally. */
  const [localVisible, setLocalVisible] = useState<Set<string>>(new Set());

  const fetchKeys = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await api.get<ApiKey[]>("/api-keys/@all-user");
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const toggleVisibility = (id: string) => {
    setLocalVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Deletes an API key via {@code DELETE /api-keys/:id} and removes it
   * from the local list optimistically on success.
   */
  const deleteKey = async (id: string) => {
    try {
      await api.delete<void>(`/api-keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete API key");
    }
  };

  /**
   * Creates a new API key via {@code POST /api-keys} and prepends the
   * returned key to the local list on success.
   */
  const handleCreate = async (input: CreateApiKeyInput) => {
    try {
      const created = await api.post<ApiKey, CreateApiKeyInput>("/api-keys", {
        ...input,
        permissions: input.permissions.map((p) => p.toUpperCase()) as ApiKeyPermission[],
      });
      setApiKeys((prev) => [...prev, created]);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    }
  };

  /**
   * Updates an existing API key via {@code PUT /api-keys/:id} and
   * replaces the stale entry in the local list with the server response.
   */
  const handleUpdate = async (id: string, input: UpdateApiKeyInput) => {
    try {
      const updated = await api.put<ApiKey, UpdateApiKeyInput>(`/api-keys/${id}`, {
        ...input,
      });
      setApiKeys((prev) => prev.map((k) => (k.id === id ? updated : k)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update API key");
    }
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

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

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
                <th className="px-6 py-4 text-left text-sm font-semibold">Expires</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {apiKeys.map((apiKey, index) => (
                    <ApiKeyRow
                      key={apiKey.id}
                      apiKey={apiKey}
                      index={index}
                      isVisible={localVisible.has(apiKey.id)}
                      onToggleVisibility={() => toggleVisibility(apiKey.id)}
                      onDelete={() => deleteKey(apiKey.id)}
                      onEdit={() => setEditingApiKey(apiKey)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <CreateApiKeyModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      <EditApiKeyModal
        open={editingApiKey !== null}
        apiKey={editingApiKey}
        onClose={() => setEditingApiKey(null)}
        onSubmit={handleUpdate}
      />
    </motion.div>
  );
}
