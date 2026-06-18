import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();

function getJwtSecret(): Uint8Array {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }
  return encoder.encode(secret);
}

const PROTECTED_ROUTES = ["/dashboard", "/settings", "/projects", "/api-keys", "/webhooks"];

const API_PROTECTED_PREFIXES = [
  "/api/projects",
  "/api/api-keys",
  "/api/secrets",
  "/api/users",
  "/api/webhooks",
];

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

function matchesPath(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

/**
 * Next.js Edge Middleware that verifies the `auth-token` JWT cookie on every
 * matching request. Authenticated users hitting auth pages are redirected to
 * the dashboard. Unauthenticated users hitting protected page/API routes are
 * either redirected to `/login` (pages) or receive a 401 JSON response (APIs).
 *
 * The matcher excludes static assets and public auth endpoints.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("auth-token")?.value;

  let authenticated = false;
  if (token) {
    try {
      const secret = getJwtSecret();
      await jwtVerify(token, secret, { algorithms: ["HS256"] });
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  // If authenticated and visiting auth pages, redirect to dashboard
  if (authenticated && matchesPath(pathname, AUTH_ROUTES)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If not authenticated and visiting protected routes
  if (
    !authenticated &&
    (matchesPath(pathname, PROTECTED_ROUTES) || matchesPath(pathname, API_PROTECTED_PREFIXES))
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", code: "UNAUTHORIZED", statusCode: 401 },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

/**
 * Paths that trigger the middleware. Static assets (`_next/static`, images,
 * favicon) and public auth/health endpoints are excluded so that
 * unauthenticated users can still log in or check server health.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|api/auth/login|api/auth/register|api/auth/forgot-password|api/auth/reset-password|api/auth/refresh|api/auth/logout|api/auth/mfa/confirm|api/auth/mfa/recovery|api/health).*)",
  ],
};
