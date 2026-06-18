/**
 * Signature for a Next.js App Router route handler. The `context` parameter
 * carries dynamic route parameters as a Promise (per Next.js 15 convention).
 */
export type RouteHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response>;

/**
 * Collection of HTTP-method route handlers for a single route segment.
 * Each key is optional — a route only needs to export the methods it handles.
 */
export type RouteHandlers = {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  DELETE?: RouteHandler;
};
