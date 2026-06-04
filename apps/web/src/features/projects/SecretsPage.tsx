import { useParams } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ROUTES } from "../../routes/paths";
import { PageHeader } from "../../components/common/PageHeader";
import { SecretsTable } from "../../features/projects/components/SecretsTable";
import { CreateSecretModal } from "../../features/projects/components/CreateSecretModal";
import { useToggleVisibility } from "../../hooks/use-toggle-visibility";
import { api } from "../../lib/api";
import type { CreateSecretInput, ProjectSecretsData, Secret } from "@repo/shared";

/**
 * Secrets listing for a specific project, resolved via the {@code :projectId}
 * route parameter.
 *
 * Fetches both the project name and its secrets from
 * {@code GET /projects/:projectId/secrets} on mount and when the
 * {@code projectId} changes. Supports adding and deleting secrets inline.
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
  const { toggle } = useToggleVisibility();
  const [visibleSet, setVisibleSet] = useState<Set<string>>(new Set());

  const fetchSecrets = useCallback(async () => {
    // Silently bail when the route param is not yet available (e.g. during
    // initial render before React Router parses the URL).
    if (!projectId) return;
    try {
      setError("");
      setLoading(true);
      const data = await api.get<ProjectSecretsData>(`/projects/${projectId}/secrets`);
      setProjectName(data?.name ?? "");
      setSecrets(Array.isArray(data?.secrets) ? data.secrets : []);
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
      await api.delete<void>(`/secrets/${id}`);
      setSecrets((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete secret");
    }
  };

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
          secrets={secrets}
          visibleSet={visibleSet}
          onToggleVisibility={handleToggleVisibility}
          onDelete={deleteSecret}
        />
      )}

      <CreateSecretModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSecret}
      />
    </motion.div>
  );
}
