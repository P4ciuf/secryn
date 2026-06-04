/**
 * Minimal user payload embedded in JWT tokens and attached to {@code req.user}.
 * Contains only the fields necessary for authorization checks — never includes
 * sensitive data like the password hash.
 *
 * @property id - Unique user identifier
 * @property email - User's email address
 * @property username - Display name (may be auto-generated from random hex)
 */
export interface LoggedUser {
  id: string;
  email: string;
  username: string;
}
