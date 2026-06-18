import { SignJWT, jwtVerify } from "jose";
import { EnvUtils } from "../utils/env";

/**
 * Centralized JWT operations using `jose` (Edge-runtime compatible).
 *
 * Replaces the Fastify-specific `fastifyApp.jwt.sign/verify/decode` pattern
 * with portable Web Crypto primitives. The secret is derived from the
 * `JWT_SECRET` environment variable as a UTF-8 `Uint8Array`.
 *
 * Security:
 * - Tokens are signed with HS256 (HMAC-SHA256).
 * - Claims are validated on every verification call (exp, iat).
 * - The `crit` header extension is rejected by default per RFC 7515 §4.1.11.
 */

const encoder = new TextEncoder();

function getSecretKey(): Uint8Array {
  return encoder.encode(EnvUtils.variables.jwtSecret);
}

/**
 * Payload nested under the `"user"` claim within auth JWT tokens.
 */
export interface JwtUserPayload {
  id: string;
  email: string;
  username: string;
}

/**
 * Signs a JWT with the given payload, embedding it under the `"user"` claim.
 *
 * @param user - The user data to embed in the token
 * @param expiresIn - Token lifetime as a duration string (e.g. `"30m"`, `"2m"`)
 * @returns The compact-serialized JWT string
 */
export async function signJwt(user: JwtUserPayload, expiresIn: string = "30m"): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

/**
 * Signs a JWT with an arbitrary payload (not wrapped under `"user"`).
 * Used for MFA challenge tokens that carry a different claim shape.
 *
 * @param payload - The full payload to embed in the token
 * @param expiresIn - Token lifetime (e.g. `"2m"`)
 * @returns The compact-serialized JWT string
 */
export async function signPayloadJwt(
  payload: Record<string, unknown>,
  expiresIn: string,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

/**
 * Verifies the JWT signature and expiration, returning the decoded payload.
 *
 * @param token - The compact-serialized JWT string
 * @returns The verified payload as a typed object
 * @throws {jose.errors.JOSEError} When the token is invalid, expired, or tampered
 */
export async function verifyJwt<T>(token: string): Promise<T> {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    algorithms: ["HS256"],
  });
  return payload as T;
}

/**
 * Decodes a JWT **without** verifying its signature.
 * Only safe for reading non-sensitive data; never use for authorization decisions.
 *
 * @param token - The compact-serialized JWT string
 * @returns The decoded payload, or `null` if the token is malformed (not signed)
 */
export function decodeJwt<T>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    if (!payload) return null;

    return JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as T;
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): Uint8Array {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
