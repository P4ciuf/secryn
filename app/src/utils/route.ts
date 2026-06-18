import { withErrorHandler } from "@/errors/apiWrapper";
import type { RouteHandlers } from "@/types/route";

/**
 * Wraps each HTTP-method handler in the given route with
 * {@link withErrorHandler} so that uncaught errors are automatically
 * converted to standardized JSON error responses.
 *
 * @param handlers - A map of HTTP methods to raw handler functions.
 * @returns A new handlers object where each function is error-wrapped.
 */
export function createHandlers(handlers: RouteHandlers): RouteHandlers {
  const wrapped: RouteHandlers = {};
  if (handlers.GET) {
    wrapped.GET = withErrorHandler(
      handlers.GET as (request: Request, context?: unknown) => Promise<Response>,
    ) as RouteHandlers["GET"];
  }
  if (handlers.POST) {
    wrapped.POST = withErrorHandler(
      handlers.POST as (request: Request, context?: unknown) => Promise<Response>,
    ) as RouteHandlers["POST"];
  }
  if (handlers.PUT) {
    wrapped.PUT = withErrorHandler(
      handlers.PUT as (request: Request, context?: unknown) => Promise<Response>,
    ) as RouteHandlers["PUT"];
  }
  if (handlers.DELETE) {
    wrapped.DELETE = withErrorHandler(
      handlers.DELETE as (request: Request, context?: unknown) => Promise<Response>,
    ) as RouteHandlers["DELETE"];
  }
  return wrapped;
}
