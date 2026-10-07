-- CreateTable
CREATE TABLE "StudentMergeIgnore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "ogrenciAId" TEXT NOT NULL,
    "ogrenciBId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentMergeIgnore_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentMergeIgnore_institutionId_ogrenciAId_ogrenciBId_key" ON "StudentMergeIgnore"("institutionId", "ogrenciAId", "ogrenciBId");
