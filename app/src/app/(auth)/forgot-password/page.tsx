"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Shield, Loader2, Mail } from "lucide-react";
import { ROUTES } from "@/data/routes";
import { apiFetch } from "@/lib/api";

/**
 * Forgot-password page. Submits the user's email to receive a password-reset
 * link. The UI shows a success state regardless of whether the email exists,
 * to prevent user enumeration. This page is noindexed.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
          <h1 className="text-3xl font-bold mb-2">Reset your password</h1>
          <p className="text-slate-400">
            {sent
              ? "Check your inbox for the reset link"
              : "Enter your email to receive a reset link"}
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-6">
            <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Mail className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-blue-300 text-sm">
                If an account with that email exists, we&apos;ve sent a password reset link. It
                expires in 1 hour.
              </p>
            </div>
            <Link
              href={ROUTES.login}
              className="inline-block text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send reset link
            </button>
            <p className="text-center text-sm text-slate-400">
              Remember your password?{" "}
              <Link href={ROUTES.login} className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
