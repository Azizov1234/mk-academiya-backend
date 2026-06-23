-- Bot tables are created with IF NOT EXISTS because older SQLite deployments
-- may already have them from `prisma db push`.

CREATE TABLE IF NOT EXISTS "bot_admins" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramUserId" TEXT,
    "telegramUsername" TEXT,
    "fullName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "bot_admins_telegramUserId_key" ON "bot_admins"("telegramUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "bot_admins_telegramUsername_key" ON "bot_admins"("telegramUsername");

CREATE TABLE IF NOT EXISTS "bot_student_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentFullName" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "scoreOrLevel" TEXT NOT NULL,
    "certificateImage" TEXT NOT NULL,
    "examDate" DATETIME NOT NULL,
    "channelPostLink" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bot_lead_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "courseType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bot_center_info" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "aboutText" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone1" TEXT NOT NULL,
    "phone2" TEXT,
    "telegramUsername" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bot_courses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
