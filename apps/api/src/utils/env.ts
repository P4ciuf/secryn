import dotenv from "dotenv";
// Load .env at import time so every consumer sees the variables without manual setup
dotenv.config({ path: ".env" });

/**
 * Centralized environment variable access with validation.
 * Every public getter validates that the required variable exists,
 * so callers never need to check for undefined values.
 *
 * @since 1.0.0
 */
export class EnvUtils {
  /**
   * Reads a single env var and throws if it is missing.
   *
   * @param key - Name of the environment variable
   * @returns The variable value (guaranteed non-empty)
   * @throws {Error} If the variable is not set or is empty
   */
  private static getKey(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  /**
   * Validates that every returned env variable is defined.
   * Recursively walks the raw object so nested values are also checked.
   *
   * @throws {Error} With a list of all missing or invalid keys
   */
  static checkEnv(): void {
    const missing: string[] = [];
    const env = this.envVariables_raw();

    // Walk the plain object recursively so nested groups are validated too
    const check = (obj: Record<string, unknown>, prefix?: string): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value === undefined || value === null || (typeof value === "number" && isNaN(value))) {
          missing.push(fullKey);
        } else if (typeof value === "object" && !Array.isArray(value)) {
          check(value as Record<string, unknown>, fullKey);
        }
      }
    };

    check(env);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  }

  /**
   * Returns every known env variable **without** validation.
   * Useful only internally when you need to inspect the raw state
   * without triggering errors.
   *
   * @returns A flat record of all expected env-variable names and their current values
   */
  private static envVariables_raw(): Record<string, unknown> {
    return {
      port: process.env["PORT"],
      nodeEnv: process.env["NODE_ENV"],
      databaseUrl: process.env["DATABASE_URL"],
      postgresUser: process.env["POSTGRES_USER"],
      postgresPassword: process.env["POSTGRES_PASSWORD"],
      postgresDb: process.env["POSTGRES_DB"],
      email: process.env["EMAIL"],
      resendApiKey: process.env["RESEND_API_KEY"],
      encryptionKey: process.env["ENCRYPTION_KEY"],
      jwtSecret: process.env["JWT_SECRET"],
      appUrl: process.env["APP_URL"],
    };
  }

  /**
   * Returns all validated environment variables.
   * Calls `checkEnv()` first as a side effect — if validation fails
   * the error propagates before any value is returned.
   *
   * @returns All required env vars with guaranteed non-empty string values
   * @throws {Error} If any required variable is missing (delegated from `checkEnv`)
   */
  static envVariables() {
    this.checkEnv();
    return {
      port: this.getKey("PORT"),
      nodeEnv: this.getKey("NODE_ENV"),
      databaseUrl: this.getKey("DATABASE_URL"),
      postgresUser: this.getKey("POSTGRES_USER"),
      postgresPassword: this.getKey("POSTGRES_PASSWORD"),
      postgresDb: this.getKey("POSTGRES_DB"),
      email: this.getKey("EMAIL"),
      resendApiKey: this.getKey("RESEND_API_KEY"),
      encryptionKey: this.getKey("ENCRYPTION_KEY"),
      jwtSecret: this.getKey("JWT_SECRET"),
      appUrl: this.getKey("APP_URL"),
    } as const;
  }
}
