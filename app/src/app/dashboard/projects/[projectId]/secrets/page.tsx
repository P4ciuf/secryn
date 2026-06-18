"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Download,
  Loader2,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/data/routes";
import { apiFetch, apiFetchText, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/pageHeader";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/emptyState";
import Breadcrumbs from "@/components/ui/breadcrumbs";

/** A single secret key-value pair with optional notes, scoped to a project. */
interface Secret {
  id: string;
  name: string;
  value: string;
  notes: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

/** Minimal project record returned alongside secrets for breadcrumb / header display. */
interface ProjectInfo {
  id: string;
  name: string;
}

/**
 * Project secrets page with CRUD operations, inline visibility toggle per
 * secret (auto-hides after 30 seconds), clipboard copy, and .env file export.
 */
export default function SecretsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createValue, setCreateValue] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [projRes, secretsRes] = await Promise.all([
        apiFetch<{ success: boolean; project: ProjectInfo }>(`/projects/${projectId}`),
        apiFetch<{ success: boolean; secrets: Secret[] }>(`/projects/${projectId}/secrets`),
      ]);
      setProject(projRes.project ?? null);
      setSecrets(secretsRes.secrets ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load secrets");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleVisible(id: string) {
    setVisibleValues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setTimeout(() => {
      setVisibleValues((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 30000); // re-hide the value after 30 seconds
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);
    try {
      await apiFetch(`/projects/${projectId}/secrets`, {
        method: "POST",
        body: JSON.stringify({ name: createName, value: createValue, notes: createNotes }),
      });
      setShowCreate(false);
      setCreateName("");
      setCreateValue("");
      setCreateNotes("");
      await loadData();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create secret");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingSecret) return;
    setEditError("");
    setEditLoading(true);
    try {
      await apiFetch(`/projects/${projectId}/secrets/${editingSecret.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName, value: editValue, notes: editNotes }),
      });
      setEditingSecret(null);
      await loadData();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to update secret");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete secret "${name}"?`)) return;
    try {
      await apiFetch(`/projects/${projectId}/secrets/${id}`, { method: "DELETE" });
      setSecrets((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete secret");
    }
  }

  async function handleExport() {
    try {
      const content = await apiFetchText(`/projects/${projectId}/secrets/export`);
      // Trigger a browser download by creating a temporary Blob URL.
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secrets-${projectId}.env`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }

  function openEdit(secret: Secret) {
    setEditingSecret(secret);
    setEditName(secret.name);
    setEditValue(secret.value);
    setEditNotes(secret.notes);
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/dashboard/projects" },
          { label: project?.name ?? "Secrets" },
        ]}
      />
      <Link
        href={`${ROUTES.dashboard.path}/${ROUTES.dashboard.children.projects}`}
        className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to projects
      </Link>

      <PageHeader
        title={project?.name ?? "Secrets"}
        description="Manage environment variables and credentials"
        action={
          <div className="flex items-center gap-3">
            {secrets.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Export .env
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Secret
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 animate-pulse"
            >
              <div className="h-4 bg-slate-700 rounded w-32 mb-2" />
              <div className="h-3 bg-slate-700 rounded w-64" />
            </div>
          ))}
        </div>
      ) : secrets.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No secrets yet"
          description="Add your first secret to this project."
          action={{ label: "Add Secret", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {secrets.map((secret) => (
            <div key={secret.id} className="bg-slate-800/30 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => openEdit(secret)}
                  className="font-mono text-sm font-semibold text-blue-400 hover:text-blue-300 text-left"
                >
                  {secret.name}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleVisible(secret.id)}
                    className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                    title={visibleValues.has(secret.id) ? "Hide value" : "Show value"}
                  >
                    {visibleValues.has(secret.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(secret.value, secret.id)}
                    className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                    title={copiedId === secret.id ? "Copied!" : "Copy value"}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(secret.id, secret.name)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors"
                    title="Delete secret"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="font-mono text-sm bg-slate-900/50 rounded px-3 py-2">
                {visibleValues.has(secret.id) ? (
                  <span className="text-slate-300 break-all">{secret.value}</span>
                ) : (
                  <span className="text-slate-600">{"•".repeat(24)}</span>
                )}
              </div>
              {secret.notes && <p className="text-xs text-slate-500 mt-2">{secret.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Secret">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {createError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Key</label>
            <input
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="DATABASE_URL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Value</label>
            <textarea
              required
              value={createValue}
              onChange={(e) => setCreateValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="secret value"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
            <input
              type="text"
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-slate-300 hover:text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}Add
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingSecret} onClose={() => setEditingSecret(null)} title="Edit Secret">
        <form onSubmit={handleUpdate} className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {editError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Key</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Value</label>
            <textarea
              required
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingSecret(null)}
              className="px-4 py-2 text-slate-300 hover:text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
