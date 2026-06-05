/**
 * Request body for {@code PUT /users}.
 * All fields are optional — only provided fields are updated.
 * When both {@code currentPassword} and {@code newPassword} are supplied,
 * the password is changed after verifying the current one.
 */
export interface UpdateUserInput {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}
