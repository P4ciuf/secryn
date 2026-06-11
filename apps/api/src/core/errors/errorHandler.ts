import { logger } from "@repo/shared";
import { AppError, type ErrorCodeValue } from "./appError.js";
import type { FastifyInstance } from "fastify";
import type { ErrorResponse } from "@repo/shared";

/**
 * Builds a standardized error response object with optional detail information.
 *
 * @param code - Machine-readable error code
 * @param details - Optional structured data providing additional error context
 */
function standardErrorResponse(
  message: string,
  code: ErrorCodeValue,
  details?: unknown,
): ErrorResponse {
  return {
    success: false as const,
    message,
    code,
    ...(details ? { details } : {}),
  };
}

/**
 * Registers a global error handler on the Fastify instance.
 * Handles AppError instances, Fastify validation errors, and unexpected errors.
 *
 * @param app - The Fastify application instance
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, req, reply) => {
    if (process.env.NODE_ENV !== "test") {
      logger.error("New Error detected:", error);
    }

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        success: false,
        message: error.message,
        code: error.errorCode,
      });
    }

    if ("validation" in (error as Record<string, unknown>)) {
      return reply
        .code(400)
        .send(
          standardErrorResponse(
            "Validation error",
            "BAD_REQUEST",
            (error as Record<string, unknown>).validation,
          ),
        );
    }

    const fallback = error as Record<string, unknown>;

    if (typeof fallback.statusCode === "number") {
      return reply
        .code(fallback.statusCode as number)
        .send(
          standardErrorResponse(
            (fallback.message as string) ?? "Request error",
            "TOO_MANY_REQUESTS",
          ),
        );
    }

    req.log.error(error);

    return reply.code(500).send(standardErrorResponse("Internal Server Error", "INTERNAL_SERVER"));
  });
}
