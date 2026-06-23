-- AlterTable
ALTER TABLE "group_assignments" ADD COLUMN "student_id" INTEGER;

-- CreateIndex
CREATE INDEX "group_assignments_student_id_idx" ON "group_assignments"("student_id");
