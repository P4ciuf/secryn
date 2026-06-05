import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../../lib/api";
import type { UpdateUserInput } from "@repo/shared";

/** Shape returned by {@code GET /users/@me} for the profile form. */
interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export function ProfileSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fetchLoading, setFetchLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /**
   * Fetches the current user profile from {@code GET /users/@me} on mount.
   * Uses a cancellation flag to prevent state updates on unmounted components
   * during rapid navigation or strict-mode double-mounts.
   */
  useEffect(() => {
    let cancelled = false;
    async function fetchUser() {
      try {
        setError("");
        setFetchLoading(true);
        const user = await api.get<UserProfile>("/users/@me");
        if (!cancelled) {
          setName(user.username);
          setEmail(user.email);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) {
          setFetchLoading(false);
        }
      }
    }
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Sends the current name and email to {@code PUT /users}. Both fields
   * are sent even if unchanged; the backend applies only the ones provided.
   */
  const handleSave = async () => {
    try {
      setError("");
      setSuccess("");
      setSaving(true);
      const body: UpdateUserInput = { name, email };
      await api.put<UserProfile>("/users", body);
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

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

      {fetchLoading ? (
        <div className="space-y-4">
          <div className="h-10 bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-10 bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-slate-700 rounded-lg animate-pulse" />
        </div>
      ) : (
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
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </motion.div>
  );
}
