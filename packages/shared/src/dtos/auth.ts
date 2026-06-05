/**
 * Request body for {@code POST /auth/login}.
 *
 * @property email - Registered user email
 * @property password - Account password (plain text — sent over HTTPS only)
 */
export interface LoginBody {
  email: string;
  password: string;
}

/**
 * Request body for {@code POST /auth/register}.
 *
 * @property email - Desired email address
 * @property password - Chosen password (min. 8 characters recommended)
 * @property username - Optional display name; a random hex name is auto-generated when omitted
 */
export interface RegisterBody {
  email: string;
  password: string;
  username?: string;
}

/**
 * Response for {@code POST /auth/login} when MFA is enabled on the account.
 * Returned instead of the normal {@code { ok: true }} response.
 *
 * @property mfaRequired - Always true, signals the client to show the OTP input
 * @property mfaToken - Short-lived JWT (2 min) that the client must send back with the OTP code
 */
export interface LoginMFAResponse {
  mfaRequired: true;
  mfaToken: string;
}

/**
 * Request body for {@code POST /auth/mfa/confirm}.
 * Sent after the user enters their TOTP code during login.
 *
 * @property token - The 6-digit TOTP code from the authenticator app
 * @property mfaToken - The short-lived MFA token returned by the login endpoint
 */
export interface MFAConfirmBody {
  token: string;
  mfaToken: string;
}

/**
 * Request body for {@code POST /auth/mfa/recovery}.
 * Sent when the user uses a backup recovery code during login.
 *
 * @property code - The 12-char hex recovery code
 * @property mfaToken - The short-lived MFA token returned by the login endpoint
 */
export interface MFARecoveryBody {
  code: string;
  mfaToken: string;
}

/**
 * Response for {@code GET /auth/mfa/setup}.
 * Contains the data needed to display the QR code and manual setup key.
 *
 * @property secret - The base32 TOTP secret (for manual entry)
 * @property qrCode - Data URL of the QR code image
 * @property otpauthUrl - The full otpauth:// URL for the authenticator app
 */
export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

/**
 * Request body for {@code POST /auth/mfa/enable}.
 * Verifies a TOTP token before activating MFA on the account.
 *
 * @property token - The 6-digit TOTP code to verify
 */
export interface MFAEnableBody {
  token: string;
}

/**
 * Response for {@code GET /auth/mfa/status}.
 */
export interface MFAStatusResponse {
  enabled: boolean;
}

/**
 * Response for {@code GET /auth/mfa/recovery-codes}.
 * Returns masked placeholders because codes are stored as HMAC‑SHA256
 * hashes — original plaintext values are only returned once during
 * enable or regenerate operations.
 */
export interface MFARecoveryCodesResponse {
  codes: string[];
}
