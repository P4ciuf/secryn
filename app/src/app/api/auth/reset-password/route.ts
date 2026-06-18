import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth";
import { withErrorHandler } from "@/errors/apiWrapper";
import type { ResetPasswordBody } from "@repo/shared";

/**
 * POST /api/auth/reset-password
 *
 * Consumes a password-reset token and sets a new password. The token is
 * invalidated immediately after use.
 *
 * @throws 400 if `token` or `password` is missing.
 * @throws 400 if the token is expired or invalid.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const body = (await request.json()) as ResetPasswordBody;

  if (!body.token || !body.password) {
    return NextResponse.json(
      {
        success: false,
        message: "Token and password are required.",
        code: "BAD_REQUEST",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const authService = await AuthService.Instance(request, null);
  const result = await authService.resetPassword(body);

  return NextResponse.json({ success: true, ...result }, { status: 200 });
});
