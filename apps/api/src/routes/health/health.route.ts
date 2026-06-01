import { fastifyApp } from "../../lib/fastify.js";

fastifyApp.get("/health", {
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
});
