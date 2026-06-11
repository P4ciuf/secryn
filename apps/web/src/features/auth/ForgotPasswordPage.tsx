import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, ArrowLeft } from "lucide-react";
import { AuthLayout } from "../../features/auth/components/AuthLayout";
import { ROUTES } from "../../routes/paths";
import { api } from "../../lib/api";
import type { ForgotPasswordBody } from "@repo/shared";

/**
 * Forgot-password page.
 *
 * Submits the user's email to {@code POST /auth/forgot-password}. The
 * backend always returns success to prevent email enumeration — the UI
 * mirrors this by displaying the "check your inbox" message for every
 * submission regardless of whether the backend actually found the email.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: ForgotPasswordBody = { email };
      await api.post("/auth/forgot-password", body);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle={sent ? "Check your inbox" : "Enter your email to reset your password"}
      footerPrompt="Remember your password?"
      footerLinkText="Sign in"
      footerLinkTo={ROUTES.LOGIN}
    >
      {sent ? (
        <div className="space-y-6 text-center">
          <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm">
            If an account with that email exists, we've sent a password reset link. Please check
            your inbox and spam folder.
          </div>
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
