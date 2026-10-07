-- CreateTable
CREATE TABLE "StudentNameAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "normalizedAd" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentNameAlias_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentNameAlias_institutionId_normalizedAd_key" ON "StudentNameAlias"("institutionId", "normalizedAd");

-- CreateIndex
CREATE INDEX "StudentNameAlias_studentId_idx" ON "StudentNameAlias"("studentId");
