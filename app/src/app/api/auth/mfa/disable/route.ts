import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { UserService } from "@/services/user";

/**
 * POST /api/auth/mfa/disable
 *
 * Disables MFA for the authenticated user. The TOTP secret and recovery codes
 * are permanently discarded.
 *
 * @throws 401 if the request is unauthenticated.
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
  await userService.disableMFA(user.id);

  return NextResponse.json({ success: true }, { status: 200 });
});
