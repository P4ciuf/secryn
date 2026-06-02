import { Link } from "react-router";
import { FolderKey, Calendar, Key } from "lucide-react";
import { motion } from "framer-motion";
import { ROUTES } from "../../../routes/paths";
import type { Project } from "../../../types";

interface ProjectCardProps {
  project: Project;
  index: number;
}

/**
 * Clickable project card that links to the project's secrets page.
 *
 * The `index` prop is used to stagger the entrance animation for each card
 * in the grid.
 */
export function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={ROUTES.SECRETS(project.id)}
        className="block bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/10"
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 ${project.color} rounded-lg flex items-center justify-center`}>
            <FolderKey className="w-6 h-6 text-white" />
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
        <p className="text-slate-400 text-sm mb-4">{project.description}</p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Key className="w-4 h-4" />
            <span>{project.secretCount} secrets</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
