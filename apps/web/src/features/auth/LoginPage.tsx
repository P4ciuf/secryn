import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Mail, Lock, Key } from "lucide-react";
import { AuthLayout } from "../../features/auth/components/AuthLayout";
import { ROUTES } from "../../routes/paths";
import { api } from "../../lib/api";
import type { LoginBody, LoginMFAResponse } from "@repo/shared";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp";

/**
 * Login page with email/password form and MFA challenge support.
 *
 * Submits credentials to {@code POST /auth/login}. If MFA is enabled on the
 * account, the backend returns an MFA challenge; the page switches to an OTP
 * input view. After MFA verification, the backend sets an httpOnly cookie and
 * the user is navigated to the projects dashboard.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // MFA challenge state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: LoginBody = { email, password };
      const result = await api.post<{ ok?: boolean } & LoginMFAResponse>("/auth/login", body);

      if ((result as LoginMFAResponse).mfaRequired) {
        setMfaRequired(true);
        setMfaToken((result as LoginMFAResponse).mfaToken);
      } else {
        navigate(ROUTES.PROJECTS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaConfirm = async () => {
    if (otpValue.length !== 6) {
      setError("Enter the full 6-digit code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post<{ ok: boolean }>("/auth/mfa/confirm", {
        token: otpValue,
        mfaToken,
      });
      navigate(ROUTES.PROJECTS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async () => {
    if (!recoveryCode.trim()) {
      setError("Enter a recovery code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post<{ ok: boolean }>("/auth/mfa/recovery", {
        code: recoveryCode.trim(),
        mfaToken,
      });
      navigate(ROUTES.PROJECTS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid recovery code");
    } finally {
      setLoading(false);
    }
  };

  const handleSendBackupCode = async () => {
    setError("");
    try {
      await api.post<{ ok: boolean }>("/auth/mfa/send-backup-code", { mfaToken });
      setError("Backup code sent to your email");
    } catch {
      setError("Failed to send backup code");
    }
  };

  if (mfaRequired) {
    return (
      <AuthLayout
        title="Two-Factor Authentication"
        subtitle={`Enter the code from your authenticator app to sign in as ${email}`}
        footerPrompt=""
        footerLinkText=""
        footerLinkTo=""
      >
        <div className="space-y-6">
          {error && (
            <div
              className={`p-3 rounded-lg text-sm ${
                error.includes("sent") || error.includes("Backup")
                  ? "bg-blue-900/30 border border-blue-700 text-blue-300"
                  : "bg-red-900/30 border border-red-700 text-red-300"
              }`}
            >
              {error}
            </div>
          )}

          {!useRecovery ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-3 text-center">
                  Enter the 6-digit code from your authenticator app
                </label>
                <div className="flex justify-center mb-2">
                  <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <button
                  type="button"
                  onClick={() => setUseRecovery(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 w-full text-center mt-2"
                >
                  Use a recovery code instead
                </button>
              </div>

              <button
                onClick={handleMfaConfirm}
                disabled={loading || otpValue.length !== 6}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Recovery Code</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter a 12-character recovery code"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setUseRecovery(false)}
                  className="text-sm text-blue-400 hover:text-blue-300 w-full text-center mt-2"
                >
                  Back to authenticator code
                </button>
              </div>

              <button
                onClick={handleRecoverySubmit}
                disabled={loading || !recoveryCode.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Sign In with Recovery Code"}
              </button>
            </>
          )}

          <div className="border-t border-slate-700 pt-4">
            <button
              onClick={handleSendBackupCode}
              className="w-full text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Lost access to your authenticator? Send a backup code via email
            </button>
          </div>

          <button
            onClick={() => {
              setMfaRequired(false);
              setMfaToken("");
              setOtpValue("");
              setRecoveryCode("");
              setUseRecovery(false);
              setError("");
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-400 transition-colors"
          >
            Back to login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access your vault"
      footerPrompt="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkTo={ROUTES.REGISTER}
    >
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

        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" />
            <span className="text-slate-300">Remember me</span>
          </label>
          <Link to={ROUTES.FORGOT_PASSWORD} className="text-blue-400 hover:text-blue-300">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>
    </AuthLayout>
  );
}
