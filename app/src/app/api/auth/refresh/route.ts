import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth";
import { setAuthCookie } from "@/utils/cookie";
import { withErrorHandler } from "@/errors/apiWrapper";

/**
 * POST /api/auth/refresh
 *
 * Issues a fresh JWT using the token embedded in the current cookie. Useful
 * for extending a session without re-authentication.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const authService = await AuthService.Instance(request, null);
  const token = await authService.refreshToken();

  await setAuthCookie(token);

  return NextResponse.json({ success: true }, { status: 200 });
});
