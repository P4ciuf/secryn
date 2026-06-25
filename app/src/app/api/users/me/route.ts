import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { UserService } from "@/services/user";
import { clearCookie } from "@/utils/cookie";
import { ApiError } from "@/errors/apiError";
import type { UpdateUserInput } from "@repo/shared";
import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * GET /api/users/me
 *
 * Returns the authenticated user's profile. Does not include sensitive fields
 * such as the password hash.
 *
 * @throws 401 if the request is unauthenticated.
 */
export const GET = withErrorHandler(async (_request: Request) => {
  const user = await getSessionOrThrow(await auth());

  const userService = await UserService.Instance(user.id as string);
  const fullUser = await userService.getUserOrThrow({ id: user.id as string });

  return NextResponse.json(
    {
      success: true,
      user: {
        id: fullUser.id as string,
        email: fullUser.email,
        username: fullUser.username,
        role: fullUser.role,
        isVerified: fullUser.isVerified,
        createdAt: fullUser.createdAt.toISOString(),
        updatedAt: fullUser.updatedAt.toISOString(),
      },
    },
    { status: 200 },
  );
});

/**
 * PUT /api/users/me
 *
 * Updates the authenticated user's profile (name, email, and/or password).
 * Changing email requires the new address not be in use. Changing password
 * requires the current password for verification.
 *
 * @throws 400 if no changes are provided or the current password is wrong.
 * @throws 401 if the request is unauthenticated.
 * @throws 409 if the new email is already taken.
 */
export const PUT = withErrorHandler(async (request: Request) => {
  const user = await getSessionOrThrow(await auth());

  const body = (await request.json()) as UpdateUserInput;

  const userService = await UserService.Instance(user.id as string);
  const currentUser = await userService.getUserOrThrow({ id: user.id as string });

  const updateData: Record<string, string> = {};

  if (body.name !== undefined && body.name !== currentUser.username) {
    updateData.username = body.name;
  }

  if (body.email !== undefined && body.email !== currentUser.email) {
    const existing = await userService.getUser({ email: body.email });
    if (existing && existing.id !== currentUser.id) {
      throw ApiError.Conflict("Email is already in use.");
    }
    updateData.email = body.email;
  }

  if (body.currentPassword && body.newPassword) {
    const valid = await UserService.comparePassword(body.currentPassword, currentUser.password);
    if (!valid) {
      throw ApiError.BadRequest("Current password is incorrect.");
    }
    updateData.password = await UserService.hashPassword(body.newPassword);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { success: false, message: "No changes provided.", code: "BAD_REQUEST", statusCode: 400 },
      { status: 400 },
    );
  }

  const updatedUser = await userService.updateUser(currentUser.id as string, updateData);

  return NextResponse.json(
    {
      success: true,
      user: {
        id: updatedUser.id as string,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    },
    { status: 200 },
  );
});

/**
 * DELETE /api/users/me
 *
 * Permanently deletes the authenticated user's account and clears the auth
 * cookie. All owned projects and secrets are cascaded.
 *
 * @throws 401 if the request is unauthenticated.
 */
export const DELETE = withErrorHandler(async (_request: Request) => {
  const user = await getSessionOrThrow(await auth());

  const userService = await UserService.Instance(user.id as string);
  await userService.getUserOrThrow({ id: user.id as string });
  await userService.deleteUser(user.id as string);
  await clearCookie("jwt");

  return NextResponse.json({ success: true }, { status: 200 });
});
