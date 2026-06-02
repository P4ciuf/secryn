import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "../../components/common/PageHeader";
import { ProjectCard } from "../../features/projects/components/ProjectCard";
import { CreateProjectModal } from "../../features/projects/components/CreateProjectModal";
import { mockProjects } from "../../data/projects";

/**
 * Projects listing page.
 *
 * Shows a responsive grid of project cards with a CTA to open the
 * Create-Project modal.
 */
export default function ProjectsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} />
        ))}
      </div>

      <CreateProjectModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </motion.div>
  );
}
