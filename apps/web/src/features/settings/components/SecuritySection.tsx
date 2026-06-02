import { Lock } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Visual stub for a password-change form with current password, new
 * password, and confirmation fields — no submission handler is wired yet.
 */
export function SecuritySection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <Lock className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-semibold">Security</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Current Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">New Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Confirm New Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
          Update Password
        </button>
      </div>
    </motion.div>
  );
}
