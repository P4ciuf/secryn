import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth";
import { setAuthCookie } from "@/utils/cookie";
import { withErrorHandler } from "@/errors/apiWrapper";
import type { LoginBody } from "@repo/shared";

/**
 * POST /api/auth/login
 *
 * Authenticates a user with email and password. If MFA is enabled the response
 * includes `requireMfa: true` and the MFA token must be confirmed separately.
 * On full success a JWT is set as an httpOnly cookie.
 *
 * @throws 400 if email or password is missing.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const body = (await request.json()) as LoginBody;

  if (!body.email || !body.password) {
    return NextResponse.json(
      {
        success: false,
        message: "Email and password are required.",
        code: "BAD_REQUEST",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const authService = await AuthService.Instance(request, null);
  const result = await authService.login(body);

  if (typeof result === "string") {
    await setAuthCookie(result);
    return NextResponse.json({ success: true }, { status: 200 });
  }

  return NextResponse.json({ success: true, ...result }, { status: 200 });
});
