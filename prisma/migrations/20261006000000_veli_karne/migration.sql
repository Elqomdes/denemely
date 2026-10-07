-- Veli karne baglantisi: bir token yalnizca bir ogrencinin bir denemesini acar.
CREATE TABLE "VeliKarne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VeliKarne_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VeliKarne_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VeliKarne_token_key" ON "VeliKarne"("token");
CREATE UNIQUE INDEX "VeliKarne_studentId_examId_key" ON "VeliKarne"("studentId", "examId");
CREATE INDEX "VeliKarne_institutionId_idx" ON "VeliKarne"("institutionId");
