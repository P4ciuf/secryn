/*
  Warnings:

  - You are about to drop the column `expires_at` on the `mfa_recovery_codes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "mfa_recovery_codes" DROP COLUMN "expires_at";
