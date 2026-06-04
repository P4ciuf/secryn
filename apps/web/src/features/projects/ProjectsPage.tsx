import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "../../components/common/PageHeader";
import { ProjectCard } from "../../features/projects/components/ProjectCard";
import { CreateProjectModal } from "../../features/projects/components/CreateProjectModal";
import { api } from "../../lib/api";
import type { CreateProjectInput, Project } from "@repo/shared";

/**
 * Projects listing page.
 *
 * Fetches projects from {@code GET /projects} on mount and displays them
 * in a responsive grid. Supports creating new projects via a modal that
 * calls {@code POST /projects} and appends the returned project to the
 * local list optimistically.
 */
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await api.get<Project[]>("/projects/@all");
      console.log("[fetchProjects] Projects: ", data);
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /**
   * Creates a project via {@code POST /projects} and prepends the returned
   * project to the local list so the UI reflects the change immediately
   * without a full re-fetch.
   */
  const handleCreate = async (input: CreateProjectInput) => {
    try {
      const created = await api.post<Project>("/projects", input);
      setProjects((prev) => [...prev, created]);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader
        title="Projects"
        subtitle="Organize your secrets by project or environment"
        actionLabel="Create Project"
        onAction={() => setShowCreateModal(true)}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        // Show exactly 3 skeleton cards to match the 3-column grid layout.
        // The count is fixed — it does not depend on how many projects
        // are returned because the data is not yet available.
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 bg-slate-800 border border-slate-700 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />
    </motion.div>
  );
}
