-- AlterTable
ALTER TABLE "leads" ADD COLUMN "answer" TEXT;
ALTER TABLE "leads" ADD COLUMN "answered_at" DATETIME;
ALTER TABLE "leads" ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT false;
