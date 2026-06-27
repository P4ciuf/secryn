-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "disabled_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_reactivation_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reactivation_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_reactivation_codes_user_id_key" ON "user_reactivation_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_reactivation_codes_code_key" ON "user_reactivation_codes"("code");

-- AddForeignKey
ALTER TABLE "user_reactivation_codes" ADD CONSTRAINT "user_reactivation_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
