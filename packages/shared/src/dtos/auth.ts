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
 * Request body for {@code POST /auth/forgot-password}.
 *
 * The backend always returns success to prevent email enumeration —
 * a reset email is only sent when the address belongs to a registered user.
 *
 * @property email - The email address to send the reset link to
 */
export interface ForgotPasswordBody {
  email: string;
}

/**
 * Request body for {@code POST /auth/reset-password}.
 *
 * The token is the single-use value sent to the user's email via
 * the forgot-password flow. Tokens expire after 1 hour.
 *
 * @property token - The reset token from the forgot-password email
 * @property password - The new password (minimum 8 characters)
 */
export interface ResetPasswordBody {
  token: string;
  password: string;
}
