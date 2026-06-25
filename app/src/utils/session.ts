import { ApiError } from "@/errors/apiError";
import { logger } from "@repo/shared";
import { Session, User } from "next-auth";

/**
 * Resolves the authenticated user from a NextAuth session object, throwing
 * an {@link ApiError.Unauthorized} when the session is absent or does not
 * contain a user. Used as a guard at the top of every protected route handler
 * and middleware.
 *
 * @param session - The session object returned by {@link auth()}.
 * @returns The resolved NextAuth {@link User} object.
 * @throws {ApiError} Unauthorized when there is no active session.
 */
export async function getSessionOrThrow(session: Session | null): Promise<User> {
  logger.info("Getting user by session");
  logger.debug(`Session: ${session}`);

  if (!session) throw ApiError.Unauthorized();

  const user = session.user;
  if (!user) throw ApiError.Unauthorized();

  logger.debug(`User: ${user}`);

  return user;
}
