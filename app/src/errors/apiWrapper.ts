import { NextResponse } from "next/server";
import { logger } from "@repo/shared";
import { ApiError } from "./apiError";
import type { ErrorResponse } from "@/types/error";

type RouteHandler = (req: Request, context?: unknown) => Promise<Response>;

/** Builds a standardized {@link ErrorResponse} payload, conditionally including details. */
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
 * Wraps a Next.js route handler with centralized error handling.
 *
 * Catches thrown errors and maps them to a structured JSON response:
 * - {@link ApiError} instances use their own status code and error code.
 * - Objects with a `validation` property are treated as 400 validation errors.
 * - Objects with a numeric `statusCode` (e.g. rate-limit errors) are forwarded as-is.
 * - Everything else becomes a generic 500 Internal Server Error.
 *
 * @param handler - The route handler to wrap.
 * @returns A function with the same signature that catches and formats errors.
 */
export function withErrorHandler(handler: RouteHandler) {
  return async (req: Request, context?: unknown): Promise<Response> => {
    try {
      return await handler(req, context);
    } catch (error: unknown) {
      // Suppress error logging during tests to keep output clean
      if (process.env.NODE_ENV !== "test") {
        logger.error(
          "New Error detected:",
          JSON.stringify(error, Object.getOwnPropertyNames(error)),
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
