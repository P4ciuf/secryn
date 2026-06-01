import type { RouteOptions } from "fastify";

/**
 * Subset of Fastify's RouteOptions that a route module must export as default.
 * The auto-loader (utils/loader.ts) discovers .route.ts files and expects each
 * to export a value conforming to this shape.
 */
export type AppRouteObject = {
  method: RouteOptions["method"];
  url: RouteOptions["url"];
  handler: RouteOptions["handler"];
  schema?: RouteOptions["schema"];
  config?: RouteOptions["config"];
};
