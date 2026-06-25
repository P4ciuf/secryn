/**
 * Discriminated union representing the outcome of a Server Action call.
 *
 * On success the caller receives the optional generic data payload;
 * on failure an error string describing what went wrong. The top-level
 * ``success`` discriminant allows callers to narrow the type with a
 * single truthiness check.
 *
 * @template T - The successful return type of the underlying action.
 *
 * @example
 * const result = await loginAction(email, password);
 * if (result.success) {
 *   redirect("/dashboard");
 * } else {
 *   setError(result.error);
 * }
 */
export type ServerActionResult<T> = {
  success: boolean;
} & (
  | {
      success: false;
      error: string;
    }
  | {
      success: true;
      data?: T;
    }
);
