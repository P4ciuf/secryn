import { useState } from "react";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../../lib/api";
import type { UpdateUserInput } from "@repo/shared";

/**
 * Password-change form validating the current password, new password
 * match, and minimum length before calling {@code PUT /users} with
 * both credentials. Clears all fields on success.
 */
export function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleUpdatePassword = async () => {
    try {
      setError("");
      setSuccess("");

      if (!currentPassword || !newPassword || !confirmPassword) {
        setError("All password fields are required");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("New passwords do not match");
        return;
      }

      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters");
        return;
      }

      setLoading(true);
      const body: UpdateUserInput = { currentPassword, newPassword };
      await api.put("/users", body);
      setSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

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
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm">
            {success}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-2">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleUpdatePassword}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </motion.div>
  );
}
