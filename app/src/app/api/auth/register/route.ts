import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth";
import { setAuthCookie } from "@/utils/cookie";
import { withErrorHandler } from "@/errors/apiWrapper";
import type { RegisterBody } from "@repo/shared";

/**
 * POST /api/auth/register
 *
 * Creates a new user account. On success a JWT is returned and set as an
 * httpOnly cookie, logging the user in immediately.
 *
 * @throws 400 if email or password is missing.
 * @throws 409 if the email is already registered.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const body = (await request.json()) as RegisterBody;

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
  const token = await authService.register(body);

  await setAuthCookie(token);

  return NextResponse.json({ success: true, token }, { status: 201 });
});
