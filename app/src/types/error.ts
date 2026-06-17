/** Standardized JSON error body returned by all API routes. */
export type ErrorResponse = {
  success: boolean;
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
};
