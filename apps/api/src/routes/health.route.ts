import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../types/route.js";

/**
 * Health-check route module consumed by the auto-loader (loader.ts).
 * Returns a static payload so load balancers and monitoring tools can verify
 * the service is alive without reaching any external dependency.
 */
export default ((_fastify: FastifyInstance) => ({
  method: "GET",
  url: "/health",
  schema: {
    summary: "Health check",
    description:
      "Returns a static payload so load balancers and monitoring tools can verify the service is alive.",
    operationId: "healthCheck",
    tags: ["Health"],
    response: {
      200: {
        description: "Service is healthy",
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
        },
      },
      500: {
        description: "Internal server error",
      },
    },
  },
  handler: async () => {
    return { status: "ok" };
  },
  // satisfies enforces AppRouteObject constraints while preserving the narrow literal type for schema inference
})) satisfies AppRouteObject;
