import crypto from "node:crypto";
import { EnvUtils } from "./env";

// Fixed salt enables deterministic key derivation: the same ENCRYPTION_KEY
// always produces the same 32-byte AES key, which is required for decrypting
// previously stored ciphertexts. The salt is versioned so a future key-rotation
// scheme can introduce a new salt without breaking existing data.
const SALT = Buffer.from("Secryn::AES256GCM::v1", "utf-8");

/**
 * Symmetric encryption utility using AES-256-GCM.
 *
 * The encryption key is derived at construction time from the
 * {@code ENCRYPTION_KEY} environment variable using scrypt with a fixed
 * salt and N=2^14 (16,384) iterations, producing a deterministic 32-byte
 * buffer. Each {@link encrypt} call generates a fresh 96-bit random IV and
 * a GCM authentication tag; the output is the colon-separated hex encoding
 * {@code iv:tag:ciphertext}.
 *
 * @since 0.1.0 — Key derivation upgraded from SHA-256 to scrypt for
 *                resistance against brute-force attacks on weak passphrases.
 *
 * @example
 * const utils = new CryptoUtils("my-secret-value");
 * const encrypted = await utils.encrypt();
 * const decrypted = await utils.decrypt(); // "my-secret-value"
 */
export class CryptoUtils {
  private cryptoKey = crypto.scryptSync(EnvUtils.variables.encryptionKey, SALT, 32, {
    N: 16384,
  });
  private algorithm: crypto.CipherGCMTypes = "aes-256-gcm";

  constructor(private readonly value: string) {}

  /**
   * Encrypts the value using AES-256-GCM.
   *
   * A fresh 96-bit IV and a GCM authentication tag are generated per call —
   * the same plaintext will produce a different ciphertext each time.
   *
   * @async
   * @returns The encrypted value in {@code iv:tag:ciphertext} hex format
   */
  async encrypt(): Promise<string> {
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(this.algorithm, this.cryptoKey, iv);

    const encrypted = Buffer.concat([cipher.update(this.value, "utf8"), cipher.final()]);

    const tag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  /**
   * Decrypts a value previously produced by {@link encrypt}.
   *
   * Splits the {@code iv:tag:ciphertext} hex string, verifies the GCM
   * authentication tag, and returns the original UTF-8 plaintext.
   *
   * @async
   * @returns The original plain-text value
   * @throws {Error} When the encrypted value is malformed (missing colon separators)
   */
  async decrypt(): Promise<string> {
    const validValue = this.value.replace("sc_", "");
    const [ivHex, tagHex, encryptedHex] = validValue.split(":");
    if (!ivHex || !tagHex || !encryptedHex) throw new Error("Invalid encrypted value");

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.cryptoKey,
      Buffer.from(ivHex, "hex"),
    );

    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]);

    return this.value.startsWith("sc_")
      ? `sc_${decrypted.toString("utf8")}`
      : decrypted.toString("utf8");
  }
}
