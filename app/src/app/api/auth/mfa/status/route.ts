import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { UserService } from "@/services/user";

/**
 * GET /api/auth/mfa/status
 *
 * Returns whether MFA is currently enabled for the authenticated user.
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
  const fullUser = await userService.getUserOrThrow({ id: user.id });

  return NextResponse.json({ success: true, enabled: fullUser.isMFAEnabled }, { status: 200 });
});
