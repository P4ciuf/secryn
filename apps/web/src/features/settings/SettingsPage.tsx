import { motion } from "framer-motion";
import { PageHeader } from "../../components/common/PageHeader";
import { ProfileSection } from "../../features/settings/components/ProfileSection";
import { SecuritySection } from "../../features/settings/components/SecuritySection";
import { MfaSection } from "../../features/settings/components/MfaSection";
import { DangerZoneSection } from "../../features/settings/components/DangerZoneSection";

/**
 * Settings hub page composing profile, security, MFA, and
 * danger-zone sections in a single scrollable view.
 */
export default function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="space-y-6">
        <ProfileSection />
        <SecuritySection />
        <MfaSection />
        <DangerZoneSection />
      </div>
    </motion.div>
  );
}
