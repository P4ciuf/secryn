import { Shield } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Account-deletion section with a red-themed border to visually indicate
 * the destructive nature of the action.
 */
export function DangerZoneSection() {
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
      <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
        Delete Account
      </button>
    </motion.div>
  );
}
