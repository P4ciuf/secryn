import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { UserService } from "@/services/user";

/**
 * GET /api/auth/mfa/recovery-codes
 *
 * Returns whether recovery codes exist for the authenticated user. Does not
 * return the codes themselves — use the regenerate endpoint to obtain fresh
 * codes.
 *
 * @throws 401 if the request is unauthenticated.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", code: "UNAUTHORIZED", statusCode: 401 },
      { status: 401 },
    );
  }

  const userService = await UserService.Instance(user.id);
  const codes = await userService.getRecoveryCodePlaceholders(user.id);

  return NextResponse.json({ success: true, codes }, { status: 200 });
});
