import { AuthService } from "../services/auth";
import type { LoggedUser } from "@repo/shared";

/**
 * Extracts and verifies the JWT from the request cookie, returning the
 * authenticated user or `null`. Safe to call from any route handler without
 * wrapping in try/catch — errors are caught internally.
 *
 * @returns The decoded user payload, or `null` if unauthenticated.
 */
export async function getAuthenticatedUser(request: Request): Promise<LoggedUser | null> {
  try {
    const authService = await AuthService.Instance(request, null);
    return await authService.verifyAndDecodeToken();
  } catch {
    return null;
  }
}
