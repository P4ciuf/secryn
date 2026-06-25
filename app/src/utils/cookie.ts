import { cookies } from "next/headers";
import { SerializeOptions } from "cookie";

/**
 * Sets a cookie on the outgoing response. Wraps Next.js's {@code cookies()}
 * API with optional serialisation settings (path, httpOnly, secure, etc.).
 *
 * @param key      - Cookie name.
 * @param value    - Cookie value.
 * @param settings - Optional {@link SerializeOptions} forwarded to the cookie store.
 */
export async function setCookie(
  key: string,
  value: string,
  settings?: SerializeOptions,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(key, value, settings);
}

/**
 * Clears the auth cookie by setting its value to empty and maxAge to 0,
 * which instructs the browser to delete it immediately.
 */
export async function clearCookie(key: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(key);
}

/**
 * Reads a cookie value by name from the incoming request.
 *
 * @param key - Cookie name to look up.
 * @returns The cookie value as a string, or {@code undefined} when not present.
 */
export async function getCookie(key: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(key)?.value;
}

/**
 * Reads a cookie value by name and throws if it is absent.
 *
 * @param key - Cookie name to look up.
 * @returns The cookie value as a string.
 * @throws {Error} When the named cookie is not present on the request.
 */
export async function getCookieOrThrow(key: string): Promise<string> {
  const cookie = await getCookie(key);
  if (!cookie) throw new Error(`Cookie ${key} not found`);
  return cookie;
}
