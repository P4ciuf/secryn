import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/utils/cookie";
import { withErrorHandler } from "@/errors/apiWrapper";

/**
 * POST /api/auth/logout
 *
 * Clears the httpOnly JWT cookie, effectively ending the session.
 * Does not require authentication — a logged-out client should always
 * receive a success response.
 */
export const POST = withErrorHandler(async () => {
  await clearAuthCookie();
  return NextResponse.json({ success: true }, { status: 200 });
});
