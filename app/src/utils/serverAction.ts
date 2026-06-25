/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { AuthError } from "next-auth";
import { ServerActionResult } from "@/types/serverAction";

/**
 * Wraps an async Server Action so that thrown errors are caught and returned
 * as a {@link ServerActionResult} rather than propagating to the caller.
 *
 * Special handling:
 * - Next.js internal redirect errors (detected via the ``NEXT_REDIRECT``
 *   digest) are re-thrown so that the framework can complete the redirect.
 * - {@link z.ZodError} instances are unwound into a human-readable string
 *   joined from the individual issue messages.
 * - {@link AuthError} instances from NextAuth are unwrapped to extract the
 *   underlying cause (ZodError, Error, or string) for a user-friendly message.
 * - Any other error type is converted to its string representation via a
 *   best-effort chain: {@code message}, string coercion, {@code JSON.stringify},
 *   or the fallback {@code "Unknown error"}.
 *
 * @template TArgs  - Tuple type of the wrapped action's parameters.
 * @template TReturn - The return type of the wrapped action on success.
 * @param action - The async Server Action to wrap.
 * @returns A new async function with the same signature that always returns
 *          a {@link ServerActionResult}.
 */
export function serverActionHandler<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>,
) {
  return async (...args: TArgs): Promise<ServerActionResult<TReturn>> => {
    try {
      const result = await action(...args);

      return { success: true, data: result };
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "digest" in error &&
        String(error.digest).startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }

      const getMessage = (): string => {
        if (error instanceof z.ZodError) {
          return error.issues.map((i) => i.message).join("\n");
        }

        if (error instanceof AuthError) {
          const cause = error.cause as any;

          const inner = cause?.err || cause?.error || cause;

          if (inner instanceof z.ZodError) {
            return inner.issues.map((i: any) => i.message).join(".");
          }

          if (inner instanceof Error) return inner.message;
          if (typeof inner === "string") return inner;

          return inner?.message || cause?.message || error.message || "Authentication error";
        }

        if (error instanceof Error) return error.message;

        if (typeof error === "string") return error;

        try {
          return (error as any)?.message ?? JSON.stringify(error);
        } catch {
          return "Unknown error";
        }
      };

      return {
        success: false,
        error: getMessage(),
      };
    }
  };
}
