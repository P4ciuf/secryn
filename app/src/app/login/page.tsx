"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Loader2 } from "lucide-react";
import { ROUTES } from "@/data/routes";
import { apiFetch } from "@/lib/api";

/**
 * Login page with two-step flow: credentials first, then MFA challenge if
 * enabled. Supports both TOTP codes and recovery codes.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [otp, setOtp] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [mfaError, setMfaError] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch<{
        success: boolean;
        mfaRequired?: boolean;
        mfaToken?: string;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.mfaRequired && res.mfaToken) {
        setMfaToken(res.mfaToken);
        setMfaRequired(true);
      } else {
        router.push(ROUTES.dashboard.path);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    setMfaError("");
    setLoading(true);

    try {
      if (useRecovery) {
        await apiFetch("/auth/mfa/recovery", {
          method: "POST",
          body: JSON.stringify({ code: recoveryCode, mfaToken }),
        });
      } else {
        await apiFetch("/auth/mfa/confirm", {
          method: "POST",
          body: JSON.stringify({ token: otp, mfaToken }),
        });
      }
      router.push(ROUTES.dashboard.path);
      router.refresh();
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "MFA verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={ROUTES.landing} className="inline-flex items-center gap-2 mb-6">
            <Shield className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold">Secryn</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-slate-400">Sign in to your account</p>
        </div>

        {!mfaRequired ? (
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <Link
                href={ROUTES.forgotPassword}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
            <p className="text-center text-sm text-slate-400">
              Don&apos;t have an account?{" "}
              <Link href={ROUTES.register} className="text-blue-400 hover:text-blue-300">
                Sign up
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="space-y-5">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-sm">
              Two-factor authentication is enabled on your account. Enter your code below.
            </div>
            {mfaError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {mfaError}
              </div>
            )}
            {!useRecovery ? (
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Authentication code
                </label>
                <input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-2xl tracking-[0.5em] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="000000"
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <label htmlFor="recovery" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Recovery code
                </label>
                <input
                  id="recovery"
                  type="text"
                  required
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter a recovery code"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setUseRecovery(!useRecovery);
                setMfaError("");
              }}
              className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {useRecovery ? "Use authenticator app instead" : "Use recovery code instead"}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
