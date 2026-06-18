import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth";
import { withErrorHandler } from "@/errors/apiWrapper";
import type { ForgotPasswordBody } from "@repo/shared";

/**
 * POST /api/auth/forgot-password
 *
 * Initiates a password-reset flow. If the email is registered, a reset token is
 * generated and emailed to the user. The response is deliberately identical
 * regardless of whether the email exists, to prevent user enumeration.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const body = (await request.json()) as ForgotPasswordBody;

  if (!body.email) {
    return NextResponse.json(
      { success: false, message: "Email is required.", code: "BAD_REQUEST", statusCode: 400 },
      { status: 400 },
    );
  }

  const authService = await AuthService.Instance(request, null);
  const result = await authService.forgotPassword(body);

  return NextResponse.json({ success: true, ...result }, { status: 200 });
});
