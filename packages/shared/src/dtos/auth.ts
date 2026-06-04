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
