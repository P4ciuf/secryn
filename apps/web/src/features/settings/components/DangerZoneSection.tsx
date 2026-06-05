import { useState } from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { api } from "../../../lib/api";
import { ROUTES } from "../../../routes/paths";

/**
 * Account-deletion section prompting the user for confirmation before
 * calling {@code DELETE /users} and navigating to the landing page.
 * Requires browser-level confirmation via {@code window.confirm}.
 */
export function DangerZoneSection() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      setError("");
      setLoading(true);
      await api.delete("/users");
      navigate(ROUTES.HOME);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-slate-800 border border-red-700/50 rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-red-400" />
        <h2 className="text-xl font-semibold text-red-400">Danger Zone</h2>
      </div>
      <p className="text-slate-400 mb-4">
        Once you delete your account, there is no going back. Please be certain.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleDeleteAccount}
        disabled={loading}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Deleting..." : "Delete Account"}
      </button>
    </motion.div>
  );
}
