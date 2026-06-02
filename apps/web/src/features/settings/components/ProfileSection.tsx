import { User } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Editable profile section with full-name and email fields.
 *
 * Currently read-only with hard-coded defaults until the save handler is
 * connected to a backend.
 */
export function ProfileSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-semibold">Profile</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Full Name</label>
          <input
            type="text"
            defaultValue="John Doe"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            defaultValue="john@example.com"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
          Save Changes
        </button>
      </div>
    </motion.div>
  );
}
