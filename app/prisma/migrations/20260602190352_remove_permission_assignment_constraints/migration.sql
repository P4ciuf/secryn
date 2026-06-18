-- DropIndex
DROP INDEX "project_member_permission_assignments_added_by_permission_key";

-- DropIndex
DROP INDEX "project_member_permission_assignments_project_member_id_added_b";

-- RenameIndex
ALTER INDEX "project_member_permission_assignments_project_member_id_permiss" RENAME TO "project_member_permission_assignments_project_member_id_per_key";
