import { useState, useEffect } from "react";
import { Shield, ShieldCheck, Key, RefreshCw, Eye, EyeOff, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../lib/api";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../../components/ui/input-otp";
import type { MFASetupResponse, MFAStatusResponse, MFARecoveryCodesResponse } from "@repo/shared";

/**
 * State machine controlling the MFA setup workflow.
 *
 * - idle:     MFA not enabled, show the setup button
 * - setup:    QR code and OTP input visible after setup API call
 * - verify:   reserved for intermediate states (not currently used in UI flow)
 * - enabled:  MFA active, show recovery codes and the disable button
 */
type Step = "idle" | "setup" | "verify" | "enabled";

/**
 * Self-contained MFA management section used on the Settings page.
 *
 * Orchestrates the full MFA lifecycle: checking status, initiating setup
 * with a QR code, enabling via TOTP verification, displaying one-time
 * recovery codes, regenerating codes, and disabling MFA.
 *
 * Recovery codes returned by {@code getRecoveryCodes} are masked because
 * the backend stores only HMAC‑SHA256 hashes — only freshly generated or
 * regenerated codes are shown in plaintext.
 */
export function MfaSection() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<Step>("idle");

  // Setup data
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Recovery codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get<MFAStatusResponse>("/auth/mfa/status");
      setMfaEnabled(res.enabled);
      if (res.enabled) {
        setStep("enabled");
        fetchRecoveryCodes();
      }
    } catch {
      // silently fail — user will see the setup option
    } finally {
      setLoading(false);
    }
  };

  const fetchRecoveryCodes = async () => {
    try {
      const res = await api.get<MFARecoveryCodesResponse>("/auth/mfa/recovery-codes");
      setRecoveryCodes(res.codes);
    } catch {
      // silently fail
    }
  };

  const handleSetup = async () => {
    try {
      setError("");
      setLoading(true);
      const res = await api.get<MFASetupResponse>("/auth/mfa/setup");
      setSetupData(res);
      setStep("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize MFA setup");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (otpValue.length !== 6) {
      setOtpError("Enter the full 6-digit code");
      return;
    }
    try {
      setOtpError("");
      setEnabling(true);
      const res = await api.post<{ recoveryCodes: string[] }>("/auth/mfa/enable", {
        token: otpValue,
      });
      setRecoveryCodes(res.recoveryCodes);
      setMfaEnabled(true);
      setStep("enabled");
      setShowCodes(true);
      setSuccess("Two-factor authentication enabled successfully");
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setEnabling(false);
    }
  };

  const handleDisable = async () => {
    try {
      setError("");
      setSuccess("");
      setDisabling(true);
      await api.post("/auth/mfa/disable");
      setMfaEnabled(false);
      setStep("idle");
      setRecoveryCodes([]);
      setShowCodes(false);
      setSuccess("Two-factor authentication disabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable MFA");
    } finally {
      setDisabling(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setError("");
      setRegenerating(true);
      const res = await api.post<{ codes: string[] }>("/auth/mfa/recovery-codes/regenerate");
      setRecoveryCodes(res.codes);
      setShowCodes(true);
      setSuccess("Recovery codes regenerated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate codes");
    } finally {
      setRegenerating(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // clipboard API not available
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
        {mfaEnabled && (
          <span className="ml-auto px-2 py-1 text-xs bg-green-900/50 text-green-400 border border-green-700 rounded-full">
            Enabled
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm mb-4">
          {success}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-10 bg-slate-700 rounded-lg animate-pulse" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {step === "idle" && !mfaEnabled && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-slate-400 text-sm mb-4">
                Add an extra layer of security to your account. When enabled, you will need to enter
                a code from your authenticator app when signing in.
              </p>
              <button
                onClick={handleSetup}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Set Up Two-Factor Authentication
              </button>
            </motion.div>
          )}

          {step === "setup" && setupData && (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <p className="text-sm text-slate-400 mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="flex justify-center mb-4">
                  <img
                    src={setupData.qrCode}
                    alt="MFA QR Code"
                    className="w-48 h-48 rounded-lg border border-slate-600 bg-white p-2"
                  />
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Or enter this key manually:</p>
                  <code className="text-sm text-slate-200 break-all">{setupData.secret}</code>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">
                  Enter the 6-digit code from your app to verify:
                </p>
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
                {otpError && <p className="text-red-400 text-sm text-center">{otpError}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep("idle");
                    setSetupData(null);
                    setOtpValue("");
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyAndEnable}
                  disabled={enabling || otpValue.length !== 6}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {enabling ? "Verifying..." : "Verify & Enable"}
                </button>
              </div>
            </motion.div>
          )}

          {step === "enabled" && mfaEnabled && (
            <motion.div
              key="enabled"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                <p className="text-green-400 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Two-factor authentication is active on your account.
                </p>
              </div>

              {/* Recovery codes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    Recovery Codes
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCodes(!showCodes)}
                      className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      title={showCodes ? "Hide codes" : "Show codes"}
                    >
                      {showCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Regenerate codes"
                    >
                      <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {recoveryCodes.length === 0 ? (
                  <p className="text-slate-500 text-sm">
                    No recovery codes available. Regenerate to create new ones.
                  </p>
                ) : recoveryCodes[0] === "****" ? (
                  <p className="text-slate-500 text-sm">
                    For security, recovery codes are stored encrypted and cannot be viewed again.
                    Regenerate to get a fresh set.
                  </p>
                ) : !showCodes ? (
                  <p className="text-slate-500 text-sm">
                    {recoveryCodes.length} codes available. Click the eye icon to view them.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((code) => (
                      <div
                        key={code}
                        className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg p-2 group"
                      >
                        <code className="text-xs text-slate-300 font-mono">{code}</code>
                        <button
                          onClick={() => copyCode(code)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded"
                          title="Copy"
                        >
                          {copiedCode === code ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Disable */}
              <div className="border-t border-slate-700 pt-4">
                <button
                  onClick={handleDisable}
                  disabled={disabling}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {disabling ? "Disabling..." : "Disable Two-Factor Authentication"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
