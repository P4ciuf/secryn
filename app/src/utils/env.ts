import dotenv from "dotenv";
dotenv.config({ path: ".env" });

interface EnvVariables {
  readonly port: string;
  readonly nodeEnv: string;
  readonly databaseUrl: string;
  readonly postgresUser: string;
  readonly postgresPassword: string;
  readonly postgresDb: string;
  readonly email: string;
  readonly resendApiKey: string;
  readonly encryptionKey: string;
  readonly jwtSecret: string;
  readonly appUrl: string;
  readonly redisUrl: string;
  readonly corsOrigins: string | undefined;
}

/**
 * Centralized environment variable access with lazy validation.
 *
 * Variables are validated only when first accessed, not at module load time.
 * This prevents runtime errors during Next.js build where env vars are absent.
 */
export class EnvUtils {
  private static getKey(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  /**
   * Validates that all required environment variables are present. Throws
   * with a list of missing keys. Useful for health checks and startup guards.
   */
  static checkEnv(): void {
    const missing: string[] = [];
    const env: Record<string, unknown> = {
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
      redisUrl: process.env["REDIS_URL"],
      corsOrigins: process.env["CORS_ORIGINS"],
    };

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

  private static _cache: EnvVariables | undefined;

  /**
   * Lazy-initialized, frozen object that validates each variable via a
   * getter only on first access. Using accessors instead of direct values
   * prevents errors at module load time (e.g. during Next.js build).
   */
  static get variables(): EnvVariables {
    if (!this._cache) {
      this._cache = Object.freeze({
        get port() {
          return EnvUtils.getKey("PORT");
        },
        get nodeEnv() {
          return EnvUtils.getKey("NODE_ENV");
        },
        get databaseUrl() {
          return EnvUtils.getKey("DATABASE_URL");
        },
        get postgresUser() {
          return EnvUtils.getKey("POSTGRES_USER");
        },
        get postgresPassword() {
          return EnvUtils.getKey("POSTGRES_PASSWORD");
        },
        get postgresDb() {
          return EnvUtils.getKey("POSTGRES_DB");
        },
        get email() {
          return EnvUtils.getKey("EMAIL");
        },
        get resendApiKey() {
          return EnvUtils.getKey("RESEND_API_KEY");
        },
        get encryptionKey() {
          return EnvUtils.getKey("ENCRYPTION_KEY");
        },
        get jwtSecret() {
          return EnvUtils.getKey("JWT_SECRET");
        },
        get appUrl() {
          return EnvUtils.getKey("APP_URL");
        },
        get redisUrl() {
          return EnvUtils.getKey("REDIS_URL");
        },
        get corsOrigins() {
          return process.env["CORS_ORIGINS"];
        },
      }) as EnvVariables;
    }
    return this._cache;
  }
}
