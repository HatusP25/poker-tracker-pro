-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "photoUrls" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "settlements" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sessions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sessions" ("createdAt", "date", "deletedAt", "endTime", "groupId", "id", "location", "notes", "photoUrls", "startTime", "updatedAt") SELECT "createdAt", "date", "deletedAt", "endTime", "groupId", "id", "location", "notes", "photoUrls", "startTime", "updatedAt" FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
CREATE INDEX "sessions_groupId_date_idx" ON "sessions"("groupId", "date");
CREATE INDEX "sessions_groupId_status_idx" ON "sessions"("groupId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
