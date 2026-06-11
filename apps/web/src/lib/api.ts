/**
 * Base URL for all API requests.
 *
 * Reads from the {@literal VITE_API_BASE_URL} environment variable set by
 * Vite at build/dev time. Defaults to {@code /api/v1} so requests are
 * relative to the current origin and go through the Vite proxy (dev) or
 * Nginx reverse proxy (production).
 */
import type { ErrorResponse } from "@repo/shared";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to prolong the current auth session by calling the refresh endpoint.
 *
 * Deduplicates concurrent refresh attempts: if a refresh is already in
 * flight, subsequent callers receive the same promise instead of
 * triggering parallel refresh requests. This prevents race conditions
 * when multiple API calls fail with 401 at the same time.
 *
 * Uses the httpOnly auth‑token cookie set by the backend — no token
 * is passed explicitly. If the backend rejects the refresh (e.g. the
 * cookie has truly expired), the function returns false and the 401
 * handler will redirect to login.
 *
 * @returns true if the token was refreshed successfully, false otherwise
 */
async function attemptTokenRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  isRefreshing = true;
  refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((res) => {
      isRefreshing = false;
      refreshPromise = null;
      return res.ok;
    })
    .catch(() => {
      isRefreshing = false;
      refreshPromise = null;
      return false;
    });
  return refreshPromise;
}

/**
 * Structured error thrown by the API client on non-2xx responses.
 *
 * @property {number} status - HTTP status code from the response
 * @property {unknown} data - Parsed JSON body of the error response, or
 *   null if the body was not valid JSON
 */
export class ApiError extends Error {
  status: number;
  data: unknown;

  /**
   * @param {number} status - HTTP response status code
   * @param {string} message - Human-readable status text (e.g. "Not Found")
   * @param {unknown} [data] - Optional parsed response body
   */
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Options for an API request, extending the standard {@code RequestInit}
 * with a JSON-serializable body and optional query-string parameters.
 *
 * @property {unknown} [body] - Request payload serialized as JSON via {@code JSON.stringify}
 * @property {Record<string, string>} [params] - Key-value pairs appended as URL query parameters
 */
interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string>;
}

/**
 * Builds the full request URL by concatenating the API base URL, the
 * endpoint path, and optional query-string parameters.
 */
function resolveUrl(path: string, params?: Record<string, string>): string {
  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  return url;
}

/**
 * Builds the headers object for a fetch request.
 *
 * Applies {@code Content-Type: application/json} when the request has a body
 * and merges any caller-supplied headers. Supports three header formats:
 * Headers instance, array of key-value tuples, and plain object.
 *
 * Authentication is handled exclusively via httpOnly cookies
 * ({@code credentials: "include"}) — no Authorization header is injected.
 */
function buildHeaders(init?: RequestInit, hasBody?: boolean): HeadersInit {
  const headers: Record<string, string> = {};

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (init?.headers) {
    const incoming = init.headers;
    if (incoming instanceof Headers) {
      incoming.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(incoming)) {
      for (const [key, value] of incoming) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, incoming);
    }
  }

  return headers;
}

/**
 * Core request function used by all HTTP method helpers.
 *
 * @template T - Expected shape of the JSON response body
 * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {string} path - Endpoint path relative to {@code API_BASE_URL}
 * @param {RequestOptions} [options] - Request options including body and query params
 * @returns {Promise<T>} The parsed JSON response, or {@code undefined} for 204 responses
 * @throws {ApiError} On any non-2xx response, with status, message, and parsed body
 *
 * Always sends {@code credentials: "include"} so httpOnly cookies
 * (e.g. the auth-token cookie set by the login endpoint) are attached
 * automatically.
 */
async function request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
  const { body, params, ...init } = options ?? {};

  // Only set Content-Type when there is a body to avoid Fastify
  // rejecting POST requests that carry the header but no payload
  const hasBody = body !== undefined;
  const response = await fetch(resolveUrl(path, params), {
    ...init,
    method,
    headers: buildHeaders(init, hasBody),
    credentials: "include",
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let data: ErrorResponse | null;
    try {
      data = (await response.json()) as ErrorResponse;
    } catch {
      data = null;
    }

    if (response.status === 401 && path !== "/auth/refresh" && path !== "/auth/login") {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return request<T>(method, path, options);
      }
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Session expired", data);
    }

    throw new ApiError(response.status, response.statusText, data);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Typed HTTP client exposing {@code get}, {@code post}, {@code put},
 * {@code patch}, and {@code delete} methods built on the native
 * {@code fetch} API.
 *
 * All methods:
 * - Resolve URLs relative to {@code API_BASE_URL}
 * - Serialize request bodies as JSON
 * - Send {@code credentials: "include"} for cookie-based auth
 * - Throw {@link ApiError} on non-2xx responses
 * - Return parsed JSON (or {@code undefined} for 204)
 *
 * @example
 * // GET request
 * const projects = await api.get<Project[]>("/projects");
 *
 * @example
 * // POST with body
 * const created = await api.post<Project>("/projects", { name: "My Project" });
 */
export const api = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, options);
  },
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return request<TResponse>("POST", path, { ...options, body });
  },
  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return request<TResponse>("PUT", path, { ...options, body });
  },
  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return request<TResponse>("PATCH", path, { ...options, body });
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, options);
  },
};
