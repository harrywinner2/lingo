-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "rawKey" TEXT,
    "cleanKey" TEXT,
    "qualityMetrics" TEXT,
    "rawDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deliveredToDrive" BOOLEAN NOT NULL DEFAULT false,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/webm',
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "score" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recording_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recording_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recording_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Recording" ("audioUrl", "campaignId", "createdAt", "durationMs", "id", "mimeType", "promptId", "score", "speakerId", "status") SELECT "audioUrl", "campaignId", "createdAt", "durationMs", "id", "mimeType", "promptId", "score", "speakerId", "status" FROM "Recording";
DROP TABLE "Recording";
ALTER TABLE "new_Recording" RENAME TO "Recording";
CREATE INDEX "Recording_campaignId_status_idx" ON "Recording"("campaignId", "status");
CREATE INDEX "Recording_promptId_idx" ON "Recording"("promptId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
