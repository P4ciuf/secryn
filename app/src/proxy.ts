import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const PROTECTED_ROUTES = ["/dashboard", "/settings", "/projects", "/api-keys", "/webhooks"];

const API_PROTECTED_PREFIXES = [
  "/api/projects",
  "/api/api-keys",
  "/api/secrets",
  "/api/users",
  "/api/webhooks",
];

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

/**
 * Checks whether a pathname matches any of the given route prefixes,
 * handling exact matches as well as children nested under the prefix.
 *
 * @param pathname - The current request pathname.
 * @param prefixes - Route prefix strings to test against.
 * @returns True when the pathname equals a prefix or starts with ``prefix/``.
 */
function matchesPath(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

/**
 * Next.js Edge Middleware that verifies the `jwt` JWT cookie on every
 * matching request. Authenticated users hitting auth pages are redirected to
 * the dashboard. Unauthenticated users hitting protected page/API routes are
 * either redirected to `/login` (pages) or receive a 401 JSON response (APIs).
 *
 * The matcher excludes static assets and public auth endpoints.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const session = await auth();

  let authenticated = false;
  if (session) {
    authenticated = true;
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|api/auth/login|api/auth/register|api/auth/forgot-password|api/auth/reset-password|api/auth/refresh|api/auth/logout|api/health).*)",
  ],
};

export { auth as proxy } from "@/auth";
