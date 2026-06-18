import { cookies } from "next/headers";
import { AuthService } from "../services/auth";

/**
 * Sets the httpOnly JWT cookie on the response. Uses the shared
 * {@link AuthService.cookieConfig} for consistency.
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AuthService.cookieName, token, AuthService.cookieConfig);
}

/**
 * Clears the auth cookie by setting its value to empty and maxAge to 0,
 * which instructs the browser to delete it immediately.
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AuthService.cookieName, "", {
    ...AuthService.cookieConfig,
    maxAge: 0,
  });
}
