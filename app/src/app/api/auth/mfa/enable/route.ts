import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { UserService } from "@/services/user";
import type { MFAEnableBody } from "@repo/shared";

/**
 * POST /api/auth/mfa/enable
 *
 * Activates MFA for the authenticated user by verifying a TOTP code against
 * the secret obtained during setup. Returns one-time recovery codes that the
 * user must store securely.
 *
 * @throws 400 if `token` or `secret` is missing.
 * @throws 401 if unauthenticated or the TOTP code is invalid.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", code: "UNAUTHORIZED", statusCode: 401 },
      { status: 401 },
    );
  }

  const body = (await request.json()) as MFAEnableBody & { secret: string };

  if (!body.token || !body.secret) {
    return NextResponse.json(
      {
        success: false,
        message: "Token and secret are required.",
        code: "BAD_REQUEST",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const userService = await UserService.Instance(user.id);

  const isValid = await userService.verifyTOTP(body.token, body.secret);
  if (!isValid) {
    return NextResponse.json(
      { success: false, message: "Invalid TOTP code.", code: "UNAUTHORIZED", statusCode: 401 },
      { status: 401 },
    );
  }

  const recoveryCodes = await userService.enableMFA(user.id, body.secret);

  return NextResponse.json({ success: true, recoveryCodes }, { status: 200 });
});
