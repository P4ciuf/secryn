import { logger } from "./logger.js";
import type {
  LoginBody,
  RegisterBody,
  LoginMFAResponse,
  MFAConfirmBody,
  MFARecoveryBody,
  MFASetupResponse,
  MFAEnableBody,
  MFAStatusResponse,
  MFARecoveryCodesResponse,
  ForgotPasswordBody,
  ResetPasswordBody,
  UpdateUserInput,
  CreateProjectInput,
  CreateSecretInput,
  UpdateSecretInput,
  CreateApiKeyInput,
  UpdateApiKeyInput,
} from "./types.js";

interface ClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
}

interface SecrynApiErrorBody {
  success: boolean;
  message: string;
  code: string;
  details?: unknown;
}

export class SecrynApiError extends Error {
  /**
   * @param message     - Human-readable error description from the API.
   * @param statusCode  - HTTP status code returned by the server.
   * @param code        - Machine-readable error identifier (e.g. ``"NOT_FOUND"``).
   * @param details     - Optional structured context (validation errors, etc.).
   */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "SecrynApiError";
  }
}

/**
 * Normalise a base URL and a relative path into a single absolute URL.
 *
 * Strips a trailing ``/`` from the base and ensures the path starts with
 * ``/`` so that the resulting URL has exactly one separator between host
 * and path regardless of the caller's formatting.
 *
 * @param base - Base URL with optional trailing slash.
 * @param path - Relative API path with optional leading slash.
 * @returns Fully-qualified URL string.
 */
function buildUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

// ---------------------------------------------------------------------------
// Cookie jar — persists auth tokens across requests in Node.js.
//
// Node's native ``fetch`` does not automatically store or send cookies the
// way browsers do. This class manually parses ``Set-Cookie`` response headers
// and injects a ``Cookie`` header on subsequent requests so that cookie-based
// authentication works server-side.
// ---------------------------------------------------------------------------
class CookieJar {
  private cookies = new Map<string, string>();

  /**
   * Extract a cookie name/value pair from a ``Set-Cookie`` header value.
   * Only the first ``name=value`` segment is kept; attributes (``Path``,
   * ``HttpOnly``, etc.) are ignored.
   */
  setFromHeader(setCookieHeader: string): void {
    const parts = setCookieHeader.split(";");
    const first = parts[0]?.trim();
    if (!first) return;
    const eq = first.indexOf("=");
    if (eq === -1) return;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (value) {
      this.cookies.set(name, value);
    }
  }

  /**
   * Serialise all stored cookies into a single ``Cookie`` header value.
   * Returns an empty string when no cookies are stored.
   */
  getCookieHeader(): string {
    if (this.cookies.size === 0) return "";
    return Array.from(this.cookies.entries())
      .map(([n, v]) => `${n}=${v}`)
      .join("; ");
  }

  clear(): void {
    this.cookies.clear();
  }
}

// ---------------------------------------------------------------------------
// SecrynClient — HTTP client for the full Secryn REST API.
//
// Supports two authentication modes:
//   • Cookie-based  — after ``auth.login``, session cookies are persisted
//     across requests via an internal ``CookieJar``.
//   • API-key-based — pass ``apiKey`` in the constructor options.
//
// All API resources are exposed as namespaced sub-objects (``auth``,
// ``projects``, ``secrets``, etc.) for discoverable auto-completion.
// ---------------------------------------------------------------------------
export class SecrynClient {
  readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly cookieJar = new CookieJar();

  /**
   * @param options - Optional configuration.
   * @param options.baseUrl - Base URL including the ``/api/v1`` prefix.
   *   Defaults to ``http://localhost:3000/api/v1``.
   * @param options.apiKey - Optional API key for programmatic access.
   */
  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "http://localhost:3000/api/v1";
    this.apiKey = options.apiKey;
  }

  // ---- raw HTTP -----------------------------------------------------------

  /**
   * Execute an HTTP request and handle common response semantics.
   *
   * Key behaviours:
   * - Injects stored cookies from the internal cookie jar as the
   *   ``Cookie`` header (enabling session-based auth).
   * - Injects the ``api-key`` header when the client was configured with one.
   * - Persists ``Set-Cookie`` response headers back into the cookie jar.
   * - Returns ``undefined`` for 204 No Content responses.
   * - Parses the body as JSON; falls back to returning the raw text on
   *   parse failure.
   * - Throws {@link SecrynApiError} when ``response.ok`` is ``false``,
   *   extracting ``message``, ``code``, and ``details`` from the JSON body
   *   when available.
   *
   * @param opts - Request definition.
   * @template T - Expected shape of the parsed JSON response.
   * @returns Parsed JSON typed as ``T``, or ``undefined`` for 204.
   * @throws {SecrynApiError} When the API responds with a non-2xx status.
   */
  private async request<T = unknown>(opts: RequestOptions): Promise<T> {
    const url = buildUrl(this.baseUrl, opts.path);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const cookieHeader = this.cookieJar.getCookieHeader();
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }
    if (this.apiKey) {
      headers["api-key"] = this.apiKey;
    }

    const init: RequestInit = {
      method: opts.method,
      headers,
    };

    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }

    const response = await fetch(url, init);

    // Persist cookies
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookieJar.setFromHeader(setCookie);
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const err = data as SecrynApiErrorBody | undefined;
      throw new SecrynApiError(
        err?.message ?? `HTTP ${response.status}`,
        response.status,
        err?.code ?? "UNKNOWN",
        err?.details,
      );
    }

    return data as T;
  }

  // ---- convenience shortcuts ----------------------------------------------

  private get<T = unknown>(path: string): Promise<T> {
    return this.request<T>({ method: "GET", path });
  }

  private post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "POST", path, body });
  }

  private put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "PUT", path, body });
  }

  private del<T = unknown>(path: string): Promise<T> {
    return this.request<T>({ method: "DELETE", path });
  }

  // =====================================================================
  // Auth
  // =====================================================================
  auth = {
    login: async (email: string, password: string): Promise<{ ok: boolean } | LoginMFAResponse> => {
      const body: LoginBody = { email, password };
      const result = await this.post<{ ok: boolean } | LoginMFAResponse>("/auth/login", body);
      // Emit an audit log on every login attempt (success or failure is
      // reflected by whether this call throws).
      logger.audit("SDK_LOGIN", email);
      return result;
    },

    register: async (
      email: string,
      password: string,
      username?: string,
    ): Promise<{ ok: boolean }> => {
      const body: RegisterBody = { email, password, username };
      return this.post<{ ok: boolean }>("/auth/register", body);
    },

    /**
     * Send a logout request and unconditionally clear the local cookie jar.
     *
     * The cookie jar is cleared inside a ``finally`` block so that even if
     * the server returns an error the local session is still discarded.
     */
    logout: async (): Promise<void> => {
      try {
        await this.post("/auth/logout");
      } finally {
        this.cookieJar.clear();
      }
    },

    refresh: async (): Promise<void> => {
      await this.post("/auth/refresh");
    },

    forgotPassword: async (email: string): Promise<{ message: string }> => {
      const body: ForgotPasswordBody = { email };
      return this.post<{ message: string }>("/auth/forgot-password", body);
    },

    resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
      const body: ResetPasswordBody = { token, password };
      return this.post<{ message: string }>("/auth/reset-password", body);
    },

    /**
     * Check whether the client currently holds any session cookies.
     * Does not validate the cookie with the server.
     */
    isAuthenticated: (): boolean => this.cookieJar.getCookieHeader() !== "",
  };

  // =====================================================================
  // MFA
  // =====================================================================
  mfa = {
    setup: (): Promise<MFASetupResponse> => this.get<MFASetupResponse>("/auth/mfa/setup"),

    enable: (token: string): Promise<MFARecoveryCodesResponse> => {
      const body: MFAEnableBody = { token };
      return this.post<MFARecoveryCodesResponse>("/auth/mfa/enable", body);
    },

    disable: (): Promise<{ ok: boolean }> => this.post<{ ok: boolean }>("/auth/mfa/disable"),

    confirm: (token: string, mfaToken: string): Promise<{ ok: boolean }> => {
      const body: MFAConfirmBody = { token, mfaToken };
      return this.post<{ ok: boolean }>("/auth/mfa/confirm", body);
    },

    recovery: (code: string, mfaToken: string): Promise<{ ok: boolean }> => {
      const body: MFARecoveryBody = { code, mfaToken };
      return this.post<{ ok: boolean }>("/auth/mfa/recovery", body);
    },

    recoveryCodes: (): Promise<MFARecoveryCodesResponse> =>
      this.get<MFARecoveryCodesResponse>("/auth/mfa/recovery-codes"),

    regenerateCodes: (): Promise<MFARecoveryCodesResponse> =>
      this.post<MFARecoveryCodesResponse>("/auth/mfa/recovery-codes/regenerate"),

    sendBackupCode: (email: string): Promise<{ message: string }> =>
      this.post<{ message: string }>("/auth/mfa/send-backup-code", { email }),

    status: (): Promise<MFAStatusResponse> => this.get<MFAStatusResponse>("/auth/mfa/status"),
  };

  // =====================================================================
  // Users
  // =====================================================================
  users = {
    me: <T = Record<string, unknown>>(): Promise<T> => this.get<T>("/users/@me"),

    get: <T = Record<string, unknown>>(userId: string): Promise<T> =>
      this.get<T>(`/users/${userId}`),

    update: <T = Record<string, unknown>>(data: UpdateUserInput): Promise<T> =>
      this.put<T>("/users", data),

    delete: (): Promise<void> => this.del("/users"),
  };

  // =====================================================================
  // API Keys
  // =====================================================================
  apiKeys = {
    create: <T = Record<string, unknown>>(
      name: string,
      permissions: ("read" | "write")[] = ["read", "write"],
    ): Promise<T> => {
      const body: CreateApiKeyInput = { name, permissions };
      return this.post<T>("/api-keys", body);
    },

    list: <T = Record<string, unknown>>(): Promise<T[]> => this.get<T[]>("/api-keys/@all-user"),

    get: <T = Record<string, unknown>>(id: string): Promise<T> => this.get<T>(`/api-keys/${id}`),

    update: <T = Record<string, unknown>>(id: string, data: UpdateApiKeyInput): Promise<T> =>
      this.put<T>(`/api-keys/${id}`, data),

    delete: (id: string): Promise<void> => this.del(`/api-keys/${id}`),
  };

  // =====================================================================
  // Projects
  // =====================================================================
  projects = {
    create: <T = Record<string, unknown>>(name: string, description?: string): Promise<T> => {
      const body: CreateProjectInput = {
        name,
        description: description ?? "",
      };
      return this.post<T>("/projects", body);
    },

    list: <T = Record<string, unknown>>(): Promise<T[]> => this.get<T[]>("/projects/@all"),

    get: <T = Record<string, unknown>>(id: string): Promise<T> => this.get<T>(`/projects/${id}`),

    update: <T = Record<string, unknown>>(
      id: string,
      data: { name?: string; description?: string },
    ): Promise<T> => this.put<T>(`/projects/${id}`, data),

    delete: (id: string): Promise<void> => this.del(`/projects/${id}`),

    transfer: <T = Record<string, unknown>>(id: string, newOwnerId: string): Promise<T> =>
      this.post<T>(`/projects/${id}/transfer`, { newOwnerId }),
  };

  // =====================================================================
  // Invites
  // =====================================================================
  invites = {
    create: <T = Record<string, unknown>>(projectId: string, email?: string): Promise<T> => {
      const body: Record<string, string> = {};
      if (email) body.email = email;
      // Send body as-is (empty object when no email) so the server creates an
      // open invite that any authenticated user can accept.
      return this.post<T>(`/projects/${projectId}/invites`, body);
    },

    /**
     * Accept a project invitation by its unique slug.
     *
     * Uses ``GET`` instead of ``POST`` because the server identifies the
     * invite via the URL slug and does not require a request body.
     */
    accept: <T = Record<string, unknown>>(slug: string): Promise<T> =>
      this.get<T>(`/projects/invites/${slug}`),
  };

  // =====================================================================
  // Members
  // =====================================================================
  members = {
    remove: (projectId: string, memberId: string): Promise<void> =>
      this.del(`/projects/${projectId}/members/${memberId}`),

    addPermissions: <T = Record<string, unknown>>(
      projectId: string,
      memberId: string,
      permissions: string[],
    ): Promise<T> =>
      this.post<T>(`/projects/${projectId}/members/${memberId}/permissions`, { permissions }),

    /**
     * Remove permissions from a member.
     *
     * The ``.then()`` chain discards the API response body because the
     * endpoint returns updated permissions on success but the caller only
     * cares that the operation completed without error.
     */
    removePermissions: <T = Record<string, unknown>>(
      projectId: string,
      memberId: string,
    ): Promise<T> =>
      this.del<T>(`/projects/${projectId}/members/${memberId}/permissions`).then(
        () => undefined as unknown as T,
      ),
  };

  // =====================================================================
  // Secrets
  // =====================================================================
  secrets = {
    create: <T = Record<string, unknown>>(
      projectId: string,
      name: string,
      value: string,
      notes?: string,
    ): Promise<T> => {
      const body: CreateSecretInput = {
        name,
        value,
        notes: notes ?? "",
      };
      return this.post<T>(`/projects/${projectId}/secrets`, body);
    },

    get: <T = Record<string, unknown>>(id: string): Promise<T> =>
      this.get<T>(`/projects/secrets/${id}`),

    list: <T = Record<string, unknown>>(projectId: string): Promise<T[]> =>
      this.get<T[]>(`/projects/${projectId}/secrets`),

    update: <T = Record<string, unknown>>(id: string, data: UpdateSecretInput): Promise<T> =>
      this.put<T>(`/projects/secrets/${id}`, data),

    delete: (id: string): Promise<void> => this.del(`/projects/secrets/${id}`),

    /**
     * Export all secrets of a project as a dotenv-formatted string.
     *
     * Uses raw ``fetch`` instead of the internal ``request`` helper because
     * the endpoint returns ``text/plain``, not ``application/json``, and
     * the response body must not be parsed as JSON.
     *
     * @throws {SecrynApiError} With code ``"EXPORT_ERROR"`` on non-2xx.
     */
    exportDotenv: (projectId: string): Promise<string> =>
      fetch(buildUrl(this.baseUrl, `/projects/${projectId}/secrets/export`), {
        headers: {
          ...(this.cookieJar.getCookieHeader() ? { Cookie: this.cookieJar.getCookieHeader() } : {}),
          ...(this.apiKey ? { "api-key": this.apiKey } : {}),
        },
      }).then((r) => {
        if (!r.ok) throw new SecrynApiError("Export failed", r.status, "EXPORT_ERROR");
        return r.text();
      }),
  };
}
