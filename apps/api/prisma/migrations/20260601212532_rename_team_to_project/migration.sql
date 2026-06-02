/*
  Warnings:

  - You are about to drop the `mfa_recovery_codes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `secrets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_invites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_member_permission_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teams` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_bans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "mfa_recovery_codes" DROP CONSTRAINT "mfa_recovery_codes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "secrets" DROP CONSTRAINT "secrets_added_by_fkey";

-- DropForeignKey
ALTER TABLE "secrets" DROP CONSTRAINT "secrets_team_id_fkey";

-- DropForeignKey
ALTER TABLE "secrets" DROP CONSTRAINT "secrets_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "team_invites" DROP CONSTRAINT "team_invites_team_id_fkey";

-- DropForeignKey
ALTER TABLE "team_member_permission_assignments" DROP CONSTRAINT "team_member_permission_assignments_added_by_fkey";

-- DropForeignKey
ALTER TABLE "team_member_permission_assignments" DROP CONSTRAINT "team_member_permission_assignments_team_member_id_fkey";

-- DropForeignKey
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_team_id_fkey";

-- DropForeignKey
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "teams" DROP CONSTRAINT "teams_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "user_bans" DROP CONSTRAINT "user_bans_added_by_fkey";

-- DropForeignKey
ALTER TABLE "user_bans" DROP CONSTRAINT "user_bans_user_id_fkey";

-- DropTable
DROP TABLE "mfa_recovery_codes";

-- DropTable
DROP TABLE "secrets";

-- DropTable
DROP TABLE "team_invites";

-- DropTable
DROP TABLE "team_member_permission_assignments";

-- DropTable
DROP TABLE "team_members";

-- DropTable
DROP TABLE "teams";

-- DropTable
DROP TABLE "user_bans";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "TeamMemberPermission";

-- DropEnum
DROP TYPE "TeamMemberRole";

-- DropEnum
DROP TYPE "UserRole";
