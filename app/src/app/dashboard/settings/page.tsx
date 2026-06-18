"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/pageHeader";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  isMFAEnabled: boolean;
}

/**
 * Account settings page: update profile, change password, manage MFA
 * (setup/enable/disable/regenerate recovery codes), and delete account.
 */
export default function SettingsPage() {
  const [_user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [userRes, mfaRes] = await Promise.all([
          apiFetch<{ success: boolean; user: UserProfile }>("/users/me"),
          apiFetch<{ success: boolean; enabled: boolean }>("/auth/mfa/status"),
        ]);
        const u = userRes.user;
        setUser(u);
        setUsername(u.username);
        setEmail(u.email);
        setMfaEnabled(mfaRes.enabled ?? u.isMFAEnabled);
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

  async function handleMfaSetup() {
    setMfaLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; secret: string; qrCode: string }>("/auth/mfa/setup");
      setMfaSecret(res.secret);
      setQrCode(res.qrCode);
      setShowMfaSetup(true);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "MFA setup failed" });
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleMfaEnable(e: FormEvent) {
    e.preventDefault();
    setMfaLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; recoveryCodes: string[] }>("/auth/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ token: mfaToken, secret: mfaSecret }),
      });
      setRecoveryCodes(res.recoveryCodes ?? []);
      setShowRecoveryCodes(true);
      setShowMfaSetup(false);
      setMfaEnabled(true);
      setMfaToken("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "MFA enable failed" });
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleMfaDisable() {
    if (!confirm("Disable two-factor authentication?")) return;
    setMfaLoading(true);
    try {
      await apiFetch("/auth/mfa/disable", { method: "POST" });
      setMfaEnabled(false);
      setMessage({ type: "success", text: "MFA disabled." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "MFA disable failed" });
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleRegenerateCodes() {
    if (!confirm("Regenerate recovery codes? Old codes will stop working.")) return;
    setMfaLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; recoveryCodes: string[] }>(
        "/auth/mfa/recovery-codes/regenerate",
        { method: "POST" },
      );
      setRecoveryCodes(res.recoveryCodes ?? []);
      setShowRecoveryCodes(true);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Regeneration failed" });
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Delete your account? This action cannot be undone.")) return;
    if (!confirm("Are you absolutely sure? All projects, secrets, and API keys will be permanently deleted.")) return;
    try {
      await apiFetch("/users/me", { method: "DELETE" });
      window.location.href = "/login";
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Deletion failed" });
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Current password</label>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm new password</label>
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

      <section className="bg-slate-800/30 rounded-xl border border-slate-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
            <p className="text-sm text-slate-400 mt-1">
              {mfaEnabled ? "MFA is enabled on your account." : "Add an extra layer of security."}
            </p>
          </div>
          {mfaEnabled ? (
            <button
              onClick={handleMfaDisable}
              disabled={mfaLoading}
              className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={handleMfaSetup}
              disabled={mfaLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {mfaLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Setup MFA
            </button>
          )}
        </div>

        {showMfaSetup && qrCode && (
          <div className="mt-4 p-6 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex flex-col items-center mb-4">
              <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-lg bg-white p-2" />
              <p className="text-xs text-slate-500 mt-2 font-mono break-all">{mfaSecret}</p>
            </div>
            <form onSubmit={handleMfaEnable} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Verification code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={mfaLoading || mfaToken.length !== 6}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {mfaLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & Enable
              </button>
            </form>
          </div>
        )}

        {showRecoveryCodes && recoveryCodes.length > 0 && (
          <div className="mt-4 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-sm mb-3">
              Save these recovery codes in a secure place. Each code can only be used once.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {recoveryCodes.map((code, i) => (
                <code key={i} className="bg-slate-900 px-3 py-1.5 rounded text-xs text-slate-300 font-mono">
                  {code}
                </code>
              ))}
            </div>
            <button
              onClick={() => setShowRecoveryCodes(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
              I&apos;ve saved these codes
            </button>
          </div>
        )}

        {mfaEnabled && (
          <button
            onClick={handleRegenerateCodes}
            disabled={mfaLoading}
            className="mt-3 px-4 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Regenerate recovery codes
          </button>
        )}
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
