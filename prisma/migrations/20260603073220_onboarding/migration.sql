-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "userId" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MagicLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetLang" TEXT NOT NULL,
    "targetLangName" TEXT,
    "pivotLang" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'active',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "autoQualify" BOOLEAN NOT NULL DEFAULT false,
    "budgetPoints" INTEGER NOT NULL DEFAULT 0,
    "spentPoints" INTEGER NOT NULL DEFAULT 0,
    "rewardRecord" INTEGER NOT NULL DEFAULT 15,
    "rewardVerify" INTEGER NOT NULL DEFAULT 5,
    "minVerifications" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("budgetPoints", "createdAt", "description", "id", "minVerifications", "ownerId", "pivotLang", "rewardRecord", "rewardVerify", "spentPoints", "status", "targetLang", "targetLangName", "title", "updatedAt") SELECT "budgetPoints", "createdAt", "description", "id", "minVerifications", "ownerId", "pivotLang", "rewardRecord", "rewardVerify", "spentPoints", "status", "targetLang", "targetLangName", "title", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_ownerId_idx" ON "Campaign"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_token_key" ON "MagicLink"("token");

-- CreateIndex
CREATE INDEX "MagicLink_campaignId_idx" ON "MagicLink"("campaignId");
