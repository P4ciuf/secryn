"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/pageHeader";
import Breadcrumbs from "@/components/ui/breadcrumbs";

/** User profile shape returned by /users/me, consumed by the settings page. */
interface UserProfile {
  id: string;
  email: string;
  username: string;
}

/**
 * Account settings page: update profile, change password, and delete account.
 */
export default function SettingsPage() {
  const [_user, setUser] = useState<UserProfile | null>(null); // stored for updates but not read directly
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const userRes = await apiFetch<{ success: boolean; user: UserProfile }>("/users/me");
        const u = userRes.user;
        setUser(u);
        setUsername(u.username);
        setEmail(u.email);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSavingProfile(true);
    try {
      const res = await apiFetch<{ success: boolean; user: UserProfile }>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ name: username, email }),
      });
      setUser(res.user);
      setMessage({ type: "success", text: "Profile updated." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Update failed" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password changed." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Change failed" });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Delete your account? This action cannot be undone.")) return;
    if (
      !confirm(
        "Are you absolutely sure? All projects, secrets, and API keys will be permanently deleted.",
      )
    )
      return;
    try {
      await apiFetch("/users/me", { method: "DELETE" });
      // Use a full-page navigation — after account deletion the auth
      // cookie is cleared and the client-side router can't proceed.
      window.location.href = "/login";
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "Deletion failed",
      });
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-48" />
          <div className="h-40 bg-slate-800/30 rounded-xl border border-slate-700" />
          <div className="h-40 bg-slate-800/30 rounded-xl border border-slate-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]} />
      <PageHeader title="Settings" description="Manage your account and security" />

      {message && (
        <div
          className={`p-3 mb-6 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="bg-slate-800/30 rounded-xl border border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
            Save changes
          </button>
        </form>
      </section>

      <section className="bg-slate-800/30 rounded-xl border border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Current password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">New password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Confirm new password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            Change password
          </button>
        </form>
      </section>

      <section className="bg-red-500/5 rounded-xl border border-red-500/20 p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-400 mb-4">
          Permanently delete your account and all associated data.
        </p>
        <button
          onClick={handleDeleteAccount}
          className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </section>
    </div>
  );
}
