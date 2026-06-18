import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { UserService } from "@/services/user";

/**
 * POST /api/auth/mfa/recovery-codes/regenerate
 *
 * Invalidates all existing recovery codes and generates a new set. Any
 * previously issued codes become unusable immediately.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 400 if MFA is not enabled on the account.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", code: "UNAUTHORIZED", statusCode: 401 },
      { status: 401 },
    );
  }

  const userService = await UserService.Instance(user.id);
  const recoveryCodes = await userService.regenerateRecoveryCodes(user.id);

  if (!recoveryCodes) {
    return NextResponse.json(
      { success: false, message: "MFA is not enabled.", code: "BAD_REQUEST", statusCode: 400 },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, recoveryCodes }, { status: 200 });
});
