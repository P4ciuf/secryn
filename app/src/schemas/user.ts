import z from "zod";

/**
 * Zod schema for validating credentials submitted via the login form or
 * NextAuth credentials provider. Requires a valid email and a password
 * of at least 8 characters.
 */
export const loginDataSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters long"),
});
