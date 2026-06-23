-- AlterTable
ALTER TABLE "tests" ADD COLUMN "is_public_exam" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tests" ADD COLUMN "public_exam_type" TEXT;
ALTER TABLE "tests" ADD COLUMN "public_exam_direction" TEXT;

-- CreateTable
CREATE TABLE "public_exam_attempts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "test_id" INTEGER NOT NULL,
    "participant_name" TEXT NOT NULL,
    "selected_mode" TEXT NOT NULL,
    "selected_level" TEXT,
    "selected_direction" TEXT,
    "estimated_level" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "max_score" INTEGER NOT NULL DEFAULT 0,
    "percentage" REAL NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "time_spent_seconds" INTEGER,
    "answers" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "public_exam_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "public_exam_attempts_test_id_idx" ON "public_exam_attempts"("test_id");
CREATE INDEX "public_exam_attempts_selected_level_idx" ON "public_exam_attempts"("selected_level");
CREATE INDEX "public_exam_attempts_selected_direction_idx" ON "public_exam_attempts"("selected_direction");
