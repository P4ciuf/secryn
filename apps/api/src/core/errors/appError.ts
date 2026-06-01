/**
 * Centralized mapping of human-readable error codes to their string identifiers.
 * Used to standardize error responses across the API.
 */
const errorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_SERVER: "INTERNAL_SERVER",
  NOT_ACCEPTABLE: "NOT_ACCEPTABLE",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_CREATED: "RESOURCE_CREATED",
  RESOURCE_DELETED: "RESOURCE_DELETED",
  RESOURCE_UPDATED: "RESOURCE_UPDATED",
} as const;

type ErrorCodeMap = typeof errorCode;

/**
 * Union type of all valid error code string values derived from the errorCode constant.
 */
export type ErrorCodeValue = ErrorCodeMap[keyof ErrorCodeMap];

/**
 * Application-level error class extending the native Error with an HTTP status code
 * and a machine-readable error code. Use the static factory methods to create instances
 * with pre-configured status codes.
 */
export class AppError extends Error {
  /** HTTP status code associated with this error. */
  statusCode: number;

  /** Machine-readable error code for client-side handling. */
  errorCode: ErrorCodeValue;

  /**
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code (default 500)
   * @param code - Machine-readable error code (default "INTERNAL_SERVER")
   */
  constructor(message?: string, statusCode = 500, code: ErrorCodeValue = "INTERNAL_SERVER") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = code;
  }

  /**
   * Creates an AppError with HTTP 400 status.
   *
   * @param code - Error code (default "BAD_REQUEST")
   */
  static BadRequest(message: string, code: ErrorCodeValue = "BAD_REQUEST") {
    return new this(message, 400, code);
  }

  /**
   * Creates an AppError with HTTP 401 status.
   *
   * @param code - Error code (default "UNAUTHORIZED")
   */
  static Unauthorized(message: string, code: ErrorCodeValue = "UNAUTHORIZED") {
    return new this(message, 401, code);
  }

  /**
   * Creates an AppError with HTTP 403 status.
   *
   * @param code - Error code (default "FORBIDDEN")
   */
  static Forbidden(message: string, code: ErrorCodeValue = "FORBIDDEN") {
    return new this(message, 403, code);
  }

  /**
   * Creates an AppError with HTTP 404 status.
   *
   * @param code - Error code (default "NOT_FOUND")
   */
  static NotFound(message: string, code: ErrorCodeValue = "NOT_FOUND") {
    return new this(message, 404, code);
  }

  /**
   * Creates an AppError with HTTP 409 status.
   */
  static Conflict(message: string) {
    return new this(message, 409, "CONFLICT");
  }

  /**
   * Creates an AppError with HTTP 500 status.
   */
  static InternalServer(message: string) {
    return new this(message, 500, "INTERNAL_SERVER");
  }

  /**
   * Creates an AppError with HTTP 406 status.
   */
  static NotAcceptable(message: string) {
    return new this(message, 406, errorCode.NOT_ACCEPTABLE);
  }

  /**
   * Creates an AppError with HTTP 429 status and a default rate-limit message.
   */
  static TooManyRequests() {
    return new this("Too many requests. Please try again later.", 429, errorCode.TOO_MANY_REQUESTS);
  }

  /**
   * Creates an AppError with HTTP 404 status using a dynamic resource name.
   *
   * @param resource - Name of the resource that was not found
   */
  static ResourceNotFound(resource: string) {
    return new this(`${resource} not found`, 404, errorCode.RESOURCE_NOT_FOUND);
  }

  /**
   * Creates an AppError with HTTP 201 status for a created resource.
   *
   * @param resource - Name of the created resource
   */
  static ResourceCreated(resource: string) {
    return new this(`${resource} created successfully`, 201, errorCode.RESOURCE_CREATED);
  }

  /**
   * Creates an AppError with HTTP 204 status for a deleted resource.
   */
  static ResourceDeleted() {
    // 204 No Content typically carries an empty body; the empty message is intentional
    return new this(``, 204, errorCode.RESOURCE_DELETED);
  }

  /**
   * Creates an AppError with HTTP 200 status for an updated resource.
   *
   * @param resource - Name of the updated resource
   */
  static ResourceUpdated(resource: string) {
    return new this(`${resource} updated successfully`, 200, errorCode.RESOURCE_UPDATED);
  }
}
