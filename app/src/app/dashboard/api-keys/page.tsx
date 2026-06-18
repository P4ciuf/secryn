"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { Key, Plus, Trash2, Copy, Loader2, Eye, EyeOff } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/pageHeader";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/emptyState";
import Breadcrumbs from "@/components/ui/breadcrumbs";

/**
 * Shape of an API key returned by the backend.
 * @property key - The raw secret value; only returned on creation, otherwise redacted.
 * @property permissions - Granular access scopes granted to this key (e.g. "read", "write").
 */
interface ApiKeyData {
  id: string;
  keyName: string;
  key: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  permissions: string[];
}

/**
 * Client-side page for managing API keys: create, view (with toggle visibility),
 * enable/disable, and delete. The raw key value is shown only once after
 * creation and is otherwise hidden behind a visibility toggle.
 */
export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPerms, setCreatePerms] = useState<string[]>(["read"]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const loadKeys = useCallback(async () => {
    try {
      const res = await apiFetch<{ success: boolean; apiKeys: ApiKeyData[] }>("/api-keys");
      setApiKeys(res.apiKeys ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  function togglePerm(perm: string) {
    setCreatePerms((prev) => {
      if (prev.includes(perm)) {
        if (prev.length === 1) return prev; // require at least one permission
        return prev.filter((p) => p !== perm);
      }
      return [...prev, perm];
    });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; apiKey: ApiKeyData }>("/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: createName, permissions: createPerms }),
      });
      setCreatedKey(res.apiKey?.key ?? null);
      setCreateName("");
      setCreatePerms(["read"]);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create API key");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete API key "${name}"?`)) return;
    try {
      await apiFetch(`/api-keys/${id}`, { method: "DELETE" });
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete API key");
    }
  }

  async function handleToggleStatus(key: ApiKeyData) {
    try {
      await apiFetch(`/api-keys/${key.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !key.isActive }),
      });
      setApiKeys((prev) =>
        prev.map((k) => (k.id === key.id ? { ...k, isActive: !k.isActive } : k)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update key");
    }
  }

  function toggleVisible(id: string) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyKey(text: string) {
    await navigator.clipboard.writeText(text);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  function closeCreateModal() {
    setShowCreate(false);
    setCreatedKey(null);
    setKeyCopied(false);
    loadKeys(); // refresh list after a key was created
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "API Keys" }]} />
      <PageHeader
        title="API Keys"
        description="Manage API keys for programmatic access"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New API Key
          </button>
        }
      />

      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-slate-800/30 rounded-lg p-5 border border-slate-700 animate-pulse"
            >
              <div className="h-4 bg-slate-700 rounded w-32 mb-2" />
              <div className="h-3 bg-slate-700 rounded w-48" />
            </div>
          ))}
        </div>
      ) : apiKeys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys yet"
          description="Create an API key to access your secrets programmatically."
          action={{ label: "Create API Key", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div key={key.id} className="bg-slate-800/30 rounded-lg border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{key.keyName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        key.isActive ? "bg-green-400" : "bg-slate-500"
                      }`}
                    />
                    <span className="text-xs text-slate-400">
                      {key.isActive ? "Active" : "Inactive"} · Expires{" "}
                      {new Date(key.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleVisible(key.id)}
                    className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                  >
                    {visibleKeys.has(key.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleStatus(key)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      key.isActive
                        ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                    }`}
                  >
                    {key.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => handleDelete(key.id, key.keyName)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {visibleKeys.has(key.id) && (
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-slate-900/50 rounded px-3 py-2 text-sm text-slate-300 break-all font-mono">
                    {key.key}
                  </code>
                  <button
                    onClick={() => copyKey(key.key)}
                    className="p-2 text-slate-400 hover:text-white rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-1 mt-2">
                {key.permissions.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs font-medium"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={closeCreateModal} title="Create API Key">
        {createdKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm mb-3">
                Copy this key now. You won&apos;t be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900 rounded px-3 py-2 text-sm text-slate-300 break-all font-mono">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyKey(createdKey)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {keyCopied ? (
                    <span className="text-xs text-green-400 font-medium px-2">Copied!</span>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={closeCreateModal}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {createError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
              <input
                type="text"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Production API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Permissions</label>
              <div className="flex gap-2">
                {["read", "write"].map((perm) => (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => togglePerm(perm)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      createPerms.includes(perm)
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {perm}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeCreateModal}
                className="px-4 py-2 text-slate-300 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}Create
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
