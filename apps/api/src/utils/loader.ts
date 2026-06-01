import fg from "fast-glob";
import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../types/route.js";

/**
 * Auto-discovers route modules under `modules/` via fast-glob and binds them
 * to the given Fastify instance.
 *
 * Switches the glob pattern between `src` (tsx / ts-node) in development and
 * `dist` (compiled JS) in production so the same code works in both
 * environments without path hacks.
 *
 * @param app - Fully configured Fastify instance (all plugins must be registered before calling this)
 * @async
 */
export async function loadRoutes(app: FastifyInstance) {
  const isProd = process.env.NODE_ENV === "production";

  // src/ for tsx in dev, dist/ for compiled JS in production
  const pattern = isProd ? "dist/modules/**/*.route.js" : "src/modules/**/*.route.ts";

  const files = await fg(pattern, {
    absolute: true,
  });

  for (const file of files) {
    const mod = await import(file);

    const route: AppRouteObject = mod.default;

    // Skip modules without a default export — may be barrel files or re-exports
    if (!route) continue;

    app.route(route);
  }
}
