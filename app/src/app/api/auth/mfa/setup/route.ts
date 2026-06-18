import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { UserService } from "@/services/user";

/**
 * GET /api/auth/mfa/setup
 *
 * Generates a TOTP secret and a QR-code data URL for the authenticated user.
 * The secret is ephemeral — it must be confirmed via the enable endpoint
 * before MFA is activated.
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
  const { secret, otpauthUrl } = userService.generateTOTPSecret();
  const qrCode = await userService.generateQRCode(otpauthUrl);

  return NextResponse.json({ success: true, secret, qrCode, otpauthUrl }, { status: 200 });
});
