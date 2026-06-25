-- Drop the mfa_recovery_codes table
DROP TABLE IF EXISTS "mfa_recovery_codes" CASCADE;

-- Drop MFA columns from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_mfa_enabled";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_secret";
