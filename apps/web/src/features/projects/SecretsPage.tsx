import { useParams } from "react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ROUTES } from "../../routes/paths";
import { PageHeader } from "../../components/common/PageHeader";
import { SecretsTable } from "../../features/projects/components/SecretsTable";
import { CreateSecretModal } from "../../features/projects/components/CreateSecretModal";
import { useToggleVisibility } from "../../hooks/use-toggle-visibility";
import { mockSecretsData } from "../../data/secrets";
import type { Secret } from "../../types";

/**
 * Secrets listing for a specific project, resolved via `:projectId` route param.
 *
 * Falls back to project `"1"` when no id is present so the page is always
 * served during development.
 */
export default function SecretsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectData = mockSecretsData[projectId || "1"];

  const [secrets, setSecrets] = useState<Secret[]>(projectData?.secrets || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const { toggle } = useToggleVisibility();
  const [visibleSet, setVisibleSet] = useState<Set<string>>(new Set());

  const handleToggleVisibility = (id: string) => {
    setVisibleSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    toggle(id);
  };

  const deleteSecret = (id: string) => {
    setSecrets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddSecret = (name: string, value: string) => {
    const newSecret: Secret = {
      id: `s${Date.now()}`,
      name,
      value,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    setSecrets((prev) => [...prev, newSecret]);
    setShowAddModal(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader
        title={`${projectData?.name || "Project"} Secrets`}
        subtitle="Manage your environment variables and API keys"
        actionLabel="Add Secret"
        onAction={() => setShowAddModal(true)}
        backTo={{ label: "Back to Projects", to: ROUTES.PROJECTS }}
      />

      <SecretsTable
        secrets={secrets}
        visibleSet={visibleSet}
        onToggleVisibility={handleToggleVisibility}
        onDelete={deleteSecret}
      />

      <CreateSecretModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSecret}
      />
    </motion.div>
  );
}
