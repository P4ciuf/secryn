"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Key, Shield, ArrowRight } from "lucide-react";
import { ROUTES } from "@/data/routes";
import { apiFetch } from "@/lib/api";

interface DashboardData {
  user: { email: string; username: string };
}

interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
}

interface ApiKeySummary {
  id: string;
  keyName: string;
}

/**
 * Dashboard overview page showing a summary of projects and API keys with
 * quick links. Fetches data from /users/me, /projects, and /api-keys in
 * parallel on mount.
 */
export default function DashboardPage() {
  const [user, setUser] = useState<DashboardData["user"] | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [userRes, projectsRes, keysRes] = await Promise.all([
          apiFetch<{ success: boolean; user: DashboardData["user"] }>("/users/me"),
          apiFetch<{ success: boolean; projects: ProjectSummary[] }>("/projects"),
          apiFetch<{ success: boolean; apiKeys: ApiKeySummary[] }>("/api-keys"),
        ]);
        setUser(userRes.user);
        setProjects(projectsRes.projects ?? []);
        setApiKeys(keysRes.apiKeys ?? []);
      } catch {
        // data may be unavailable — show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          Welcome{user ? `, ${user.username || user.email}` : ""}
        </h1>
        <p className="text-slate-400">Manage your secrets and API keys</p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-20 mb-3" />
              <div className="h-8 bg-slate-700 rounded w-12 mb-2" />
              <div className="h-3 bg-slate-700 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Link
              href={`${ROUTES.dashboard.path}/${ROUTES.dashboard.children.projects}`}
              className="bg-slate-800/30 rounded-xl border border-slate-700 p-6 hover:border-blue-500/50 transition-colors group"
            >
              <FolderKanban className="w-8 h-8 text-blue-400 mb-4" />
              <div className="text-3xl font-bold mb-1">{projects.length}</div>
              <div className="text-slate-400 group-hover:text-slate-300 flex items-center gap-1">
                Projects <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            <Link
              href={`${ROUTES.dashboard.path}/${ROUTES.dashboard.children.apiKeys}`}
              className="bg-slate-800/30 rounded-xl border border-slate-700 p-6 hover:border-green-500/50 transition-colors group"
            >
              <Key className="w-8 h-8 text-green-400 mb-4" />
              <div className="text-3xl font-bold mb-1">{apiKeys.length}</div>
              <div className="text-slate-400 group-hover:text-slate-300 flex items-center gap-1">
                API Keys <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
              <Shield className="w-8 h-8 text-purple-400 mb-4" />
              <div className="text-3xl font-bold mb-1">—</div>
              <div className="text-slate-400">Secured</div>
            </div>
          </div>

          {projects.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Projects</h2>
                <Link
                  href={`${ROUTES.dashboard.path}/${ROUTES.dashboard.children.projects}`}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {projects.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    href={`${ROUTES.dashboard.path}/${ROUTES.dashboard.children.projects}/${p.id}/secrets`}
                    className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FolderKanban className="w-5 h-5 text-blue-400" />
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">{p.slug}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
