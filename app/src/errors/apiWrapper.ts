import { NextResponse } from "next/server";
import { logger } from "@repo/shared";
import { ApiError } from "./apiError";
import type { ErrorResponse } from "@/types/error";

function standardErrorResponse(props: {
  name: string;
  message: string;
  statusCode: number;
  details?: unknown;
}): ErrorResponse {
  return {
    success: false,
    message: props.message,
    code: props.name,
    statusCode: props.statusCode,
    ...(props.details ? { details: props.details } : {}),
  };
}

/**
 * Higher-order function that wraps a Next.js Route Handler to provide
 * centralized error handling. Catches synchronous and asynchronous errors,
 * converts them to a standardized JSON error response, and logs the error
 * (skipped in the `test` environment).
 *
 * Recognized error types:
 * - `ApiError` — used directly with its status code and code.
 * - Object with `validation` property — treated as a 400 Bad Request.
 * - Object with numeric `statusCode` — treated as a rate-limiting error (429).
 * - Anything else — treated as a generic 500 Internal Server Error.
 *
 * @param handler - The raw route handler (GET, POST, etc.) to wrap.
 * @returns A new handler with the same signature that delegates to `handler`
 *          inside a try/catch block.
 */
export function withErrorHandler(
  handler: (request: Request, context?: unknown) => Promise<Response>,
): (request: Request, context?: unknown) => Promise<Response> {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error: unknown) {
      if (process.env.NODE_ENV !== "test") {
        logger.error(
          `New Error detected: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`,
        );
      }

      let errorResponse: ErrorResponse;

      if (error instanceof ApiError) {
        errorResponse = standardErrorResponse({
          name: error.errorCode,
          message: error.message,
          statusCode: error.statusCode,
        });
      } else if (typeof error === "object" && error !== null && "validation" in error) {
        errorResponse = standardErrorResponse({
          name: "BAD_REQUEST",
          message: "Validation error",
          statusCode: 400,
          details: (error as { validation: unknown }).validation,
        });
      } else if (
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof (error as { statusCode: unknown }).statusCode === "number"
      ) {
        const err = error as { statusCode: number; message?: string };
        errorResponse = standardErrorResponse({
          name: "TOO_MANY_REQUESTS",
          message: err.message ?? "Request error",
          statusCode: err.statusCode,
        });
      } else {
        errorResponse = standardErrorResponse({
          name: "INTERNAL_SERVER",
          message: "Internal Server Error",
          statusCode: 500,
        });
      }

      return NextResponse.json(errorResponse, {
        status: errorResponse.statusCode,
      });
    }
  };
}
