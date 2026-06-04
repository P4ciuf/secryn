import type { ErrorCodeValue } from "../enums/error-code.js";

/**
 * Standardized JSON structure returned by the API on every non-2xx response.
 *
 * @property success - Always {@code false} for error responses
 * @property message - Human-readable description of the error
 * @property code - Machine-readable error code from {@link errorCode}
 * @property details - Optional structured data providing additional context (e.g. validation errors)
 */
export interface ErrorResponse {
  success: false;
  message: string;
  code: ErrorCodeValue;
  details?: unknown;
}
