import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth";
import { setAuthCookie } from "@/utils/cookie";
import { withErrorHandler } from "@/errors/apiWrapper";
import type { MFARecoveryBody } from "@repo/shared";

/**
 * POST /api/auth/mfa/recovery
 *
 * Completes MFA login using a single-use recovery code instead of a TOTP code.
 * Consumed codes are invalidated immediately.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const body = (await request.json()) as MFARecoveryBody;

  if (!body.code || !body.mfaToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Code and mfaToken are required.",
        code: "BAD_REQUEST",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const authService = await AuthService.Instance(request, null);
  const token = await authService.recoverMFA(body.code, body.mfaToken);

  await setAuthCookie(token);

  return NextResponse.json({ success: true }, { status: 200 });
});
