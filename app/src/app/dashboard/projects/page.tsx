"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Trash2, Loader2 } from "lucide-react";
import { ROUTES } from "@/data/routes";
import { apiFetch, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/pageHeader";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/emptyState";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  createdAt: string;
}

/**
 * Lists all projects for the current user with create and delete actions.
 * Clicking a project navigates to its secrets page.
 */
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const res = await apiFetch<{ success: boolean; projects: Project[] }>("/projects");
      setProjects(res.projects ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({ name: createName, description: createDesc }),
      });
      setShowCreate(false);
      setCreateName("");
      setCreateDesc("");
      await loadProjects();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete project "${name}"? This will remove all secrets.`)) return;

    try {
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete project");
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <PageHeader
        title="Projects"
        description="Manage your project workspaces"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        }
      />

      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/30 rounded-lg p-5 border border-slate-700 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-40 mb-2" />
              <div className="h-3 bg-slate-700 rounded w-60" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start storing secrets."
          action={{ label: "Create Project", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-5 bg-slate-800/30 rounded-lg border border-slate-700"
            >
              <Link
                href={`${ROUTES.dashboard.path}/projects/${p.id}/secrets`}
                className="flex-1 hover:text-blue-400 transition-colors"
              >
                <h3 className="font-semibold mb-1">{p.name}</h3>
                <p className="text-slate-400 text-sm">{p.description || "No description"}</p>
                <p className="text-slate-500 text-xs mt-1">/{p.slug}</p>
              </Link>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded"
                title="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Project">
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
              placeholder="My Project"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Optional description"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
