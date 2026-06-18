const BASE = "/api";

interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Client-side error thrown when an API response has a non-2xx status.
 * Carries the server-provided `code` and `statusCode` for UI display.
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(response: ApiErrorResponse) {
    super(response.message);
    this.statusCode = response.statusCode;
    this.code = response.code;
    this.name = "ApiError";
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  // Deduplicate concurrent refresh attempts — multiple 401 responses
  // that arrive before the first refresh completes share the same promise.
  isRefreshing = true;
  refreshPromise = fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  }).then((res) => res.ok);

  const ok = await refreshPromise;
  isRefreshing = false;
  refreshPromise = null;
  return ok;
}

/**
 * Thin wrapper around `fetch` that prepends `/api`, sends credentials, and
 * sets `Content-Type: application/json`. On a 401 response, attempts a
 * transparent token refresh before retrying the request once. Non-2xx
 * responses throw an {@link ApiError}.
 *
 * @template T - Expected JSON response shape (defaults to `unknown`).
 * @param url   - Path relative to `/api` (e.g. `"/projects"`).
 * @param options - Standard `RequestInit` overrides.
 * @returns The parsed JSON body.
 * @throws {ApiError} On non-2xx responses (after retry) or failed refresh.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401 && !isRefreshing) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const retry = await fetch(`${BASE}${url}`, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      if (!retry.ok) {
        const errBody = await retry.json().catch(() => ({}));
        throw new ApiError(errBody as ApiErrorResponse);
      }
      return retry.json() as Promise<T>;
    }

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError({
      success: false,
      message: "Session expired. Please log in again.",
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({
      success: false,
      message: res.statusText,
      code: "UNKNOWN",
      statusCode: res.status,
    }));
    throw new ApiError(errBody as ApiErrorResponse);
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  return {} as T;
}

/**
 * Like {@link apiFetch} but returns the raw response body as a string instead
 * of parsing JSON. Used for the `.env` file export endpoint.
 *
 * @param url     - Path relative to `/api`.
 * @param options - Standard `RequestInit` overrides.
 * @returns The response body as plain text.
 * @throws {ApiError} On non-2xx responses.
 */
export async function apiFetchText(
  url: string,
  options: RequestInit = {},
): Promise<string> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError({
      success: false,
      message: res.statusText,
      code: "UNKNOWN",
      statusCode: res.status,
    });
  }

  return res.text();
}
