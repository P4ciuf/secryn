import { useParams } from "react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { ROUTES } from "../../routes/paths";
import { PageHeader } from "../../components/common/PageHeader";
import { SecretsTable } from "../../features/projects/components/SecretsTable";
import { CreateSecretModal } from "../../features/projects/components/CreateSecretModal";
import { useToggleVisibility } from "../../hooks/use-toggle-visibility";
import { api, API_BASE_URL } from "../../lib/api.js";
import type { CreateSecretInput, Secret, UpdateSecretInput } from "@repo/shared";
import { UpdateSecretModal } from "./components/UpdateSecretModal";

/**
 * Secrets listing for a specific project, resolved via the {@code :projectId}
 * route parameter.
 *
 * Fetches both the project name and its secrets from
 * {@code GET /projects/:projectId/secrets} on mount and when the
 * {@code projectId} changes. Supports client-side search filtering by
 * secret name, adding, editing, and deleting secrets inline.
 * The header shows a fallback title of "Project" when no name has been
 * loaded yet.
 */
export default function SecretsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState("");
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toggle } = useToggleVisibility();
  const [visibleSet, setVisibleSet] = useState<Set<string>>(new Set());

  const fetchSecrets = useCallback(async () => {
    // Silently bail when the route param is not yet available (e.g. during
    // initial render before React Router parses the URL).
    if (!projectId) return;
    try {
      setError("");
      setLoading(true);
      const data = await api.get<Secret[]>(`/projects/${projectId}/secrets`);
      setSecrets(data ?? []);
      setProjectName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load secrets");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  /**
   * Client-side filtering: case-insensitive match against the secret name.
   * Re-computes only when {@code secrets} or {@code searchQuery} change.
   */
  const filteredSecrets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return secrets;
    return secrets.filter((s) => s.name.toLowerCase().includes(query));
  }, [secrets, searchQuery]);

  /**
   * Toggles visibility for a single secret. Updates both the local visible-set
   * (used by {@code SecretsTable} to show/hide values) and the clipboard hook
   * state so the secret can be copied only while revealed.
   */
  const handleToggleVisibility = (id: string) => {
    setVisibleSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    toggle(id);
  };

  const deleteSecret = async (id: string) => {
    try {
      await api.delete<void>(`/projects/secrets/${id}`);
      setSecrets((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete secret");
    }
  };

  const handleEditClick = (secret: Secret) => {
    setEditingSecret(secret);
    setShowUpdateModal(true);
  };

  const handleUpdateSecret = async (input: UpdateSecretInput & { id: string }) => {
    try {
      const updated = await api.put<Secret, UpdateSecretInput>(
        `/projects/secrets/${input.id}`,
        input,
      );
      setSecrets((prev) => prev.map((s) => (s.id === input.id ? updated : s)));
      setShowUpdateModal(false);
      setEditingSecret(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update secret");
    }
  };

  /**
   * Downloads all project secrets as a {@code .env} file.
   *
   * Streams the export via a direct {@code fetch} call (not the typed API
   * client) because the response is a plain-text blob, not JSON. Creates a
   * temporary object URL to trigger the browser download, then revokes it
   * to free memory.
   */
  const handleExport = useCallback(async () => {
    if (!projectId) return;
    try {
      setError("");
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/secrets/export`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const content = await response.text();
      const disposition = response.headers.get("content-disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? "secrets.env";
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export secrets");
    }
  }, [projectId]);

  const handleAddSecret = async (input: CreateSecretInput) => {
    if (!projectId) return;
    try {
      const created = await api.post<Secret, CreateSecretInput>(
        `/projects/${projectId}/secrets`,
        input,
      );
      setSecrets((prev) => [...prev, created]);
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create secret");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader
        title={`${projectName || "Project"} Secrets`}
        subtitle="Manage your environment variables and API keys"
        actionLabel="Add Secret"
        onAction={() => setShowAddModal(true)}
        secondaryAction={{
          label: "Export .env",
          icon: <Download className="w-4 h-4" />,
          onClick: handleExport,
        }}
        backTo={{ label: "Back to Projects", to: ROUTES.PROJECTS }}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 animate-pulse">
          <div className="h-8 bg-slate-700 rounded mb-4 w-1/3" />
          <div className="h-4 bg-slate-700 rounded mb-2" />
          <div className="h-4 bg-slate-700 rounded mb-2" />
          <div className="h-4 bg-slate-700 rounded" />
        </div>
      ) : (
        <SecretsTable
          secrets={filteredSecrets}
          visibleSet={visibleSet}
          onToggleVisibility={handleToggleVisibility}
          onDelete={deleteSecret}
          onEdit={handleEditClick}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          hasNoMatches={searchQuery.trim().length > 0 && filteredSecrets.length === 0}
          totalCount={secrets.length}
        />
      )}

      <CreateSecretModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSecret}
      />
      {editingSecret && (
        <UpdateSecretModal
          open={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false);
            setEditingSecret(null);
          }}
          onSubmit={handleUpdateSecret}
          secret={editingSecret}
        />
      )}
    </motion.div>
  );
}
