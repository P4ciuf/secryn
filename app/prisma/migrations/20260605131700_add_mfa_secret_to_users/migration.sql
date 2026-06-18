-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "description" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfa_secret" TEXT;
