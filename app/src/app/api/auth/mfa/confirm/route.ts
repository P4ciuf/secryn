import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth";
import { setAuthCookie } from "@/utils/cookie";
import { withErrorHandler } from "@/errors/apiWrapper";
import type { MFAConfirmBody } from "@repo/shared";

/**
 * POST /api/auth/mfa/confirm
 *
 * Completes the second factor of a login that required MFA. The `token` is the
 * temporary token returned by the login endpoint; `mfaToken` is the TOTP code
 * from the user's authenticator app. On success a full JWT is set as a cookie.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const body = (await request.json()) as MFAConfirmBody;

  if (!body.token || !body.mfaToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Token and mfaToken are required.",
        code: "BAD_REQUEST",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const authService = await AuthService.Instance(request, null);
  const token = await authService.confirmMFA(body.token, body.mfaToken);

  await setAuthCookie(token);

  return NextResponse.json({ success: true }, { status: 200 });
});
