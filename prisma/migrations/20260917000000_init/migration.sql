-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "il" TEXT,
    "ilce" TEXT,
    "logoUrl" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "notlar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kullaniciAdi" TEXT NOT NULL,
    "sifreHash" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'KURUM_YETKILISI',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "sonGirisTarihi" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "institutionId" TEXT,
    CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "normalizedAd" TEXT NOT NULL,
    "ogrenciNo" TEXT,
    "sinif" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sinavTuru" TEXT NOT NULL DEFAULT 'TYT',
    "format" TEXT NOT NULL,
    "tarih" DATETIME NOT NULL,
    "kaynakDosya" TEXT,
    "toplamSoru" INTEGER NOT NULL DEFAULT 0,
    "notlar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "yukleyenId" TEXT,
    CONSTRAINT "Exam_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Exam_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sayfaNo" INTEGER,
    "puan" REAL,
    "genelOrtalamaPuan" REAL,
    "yuzdelikDilim" REAL,
    "toplamSoru" INTEGER NOT NULL,
    "toplamDogru" INTEGER NOT NULL,
    "toplamYanlis" INTEGER NOT NULL,
    "toplamBos" INTEGER NOT NULL,
    "toplamNet" REAL NOT NULL,
    "basariYuzde" REAL,
    "sinifSira" INTEGER,
    "kurumSira" INTEGER,
    "ilceSira" INTEGER,
    "ilSira" INTEGER,
    "genelSira" INTEGER,
    "sinifKatilim" INTEGER,
    "kurumKatilim" INTEGER,
    "ilceKatilim" INTEGER,
    "ilKatilim" INTEGER,
    "genelKatilim" INTEGER,
    "uyarilar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExamResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubjectResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examResultId" TEXT NOT NULL,
    "dersAdi" TEXT NOT NULL,
    "dersGrubu" TEXT NOT NULL,
    "isGrup" BOOLEAN NOT NULL DEFAULT false,
    "soru" INTEGER NOT NULL,
    "dogru" INTEGER NOT NULL,
    "yanlis" INTEGER NOT NULL,
    "bos" INTEGER NOT NULL,
    "net" REAL NOT NULL,
    "basariYuzde" REAL,
    "sinifOrt" REAL,
    "kurumOrt" REAL,
    "genelOrt" REAL,
    CONSTRAINT "SubjectResult_examResultId_fkey" FOREIGN KEY ("examResultId") REFERENCES "ExamResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TopicResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examResultId" TEXT NOT NULL,
    "dersAdi" TEXT NOT NULL,
    "dersGrubu" TEXT NOT NULL,
    "kazanim" TEXT NOT NULL,
    "soru" INTEGER NOT NULL,
    "dogru" INTEGER NOT NULL,
    "yanlis" INTEGER NOT NULL,
    "basariYuzde" REAL,
    CONSTRAINT "TopicResult_examResultId_fkey" FOREIGN KEY ("examResultId") REFERENCES "ExamResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnswerSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examResultId" TEXT NOT NULL,
    "dersGrubu" TEXT NOT NULL,
    "kitapcik" TEXT,
    "cevapAnahtari" TEXT NOT NULL,
    "ogrenciCevaplari" TEXT NOT NULL,
    CONSTRAINT "AnswerSheet_examResultId_fkey" FOREIGN KEY ("examResultId") REFERENCES "ExamResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_kullaniciAdi_key" ON "User"("kullaniciAdi");

-- CreateIndex
CREATE INDEX "User_institutionId_idx" ON "User"("institutionId");

-- CreateIndex
CREATE INDEX "Student_institutionId_sinif_idx" ON "Student"("institutionId", "sinif");

-- CreateIndex
CREATE UNIQUE INDEX "Student_institutionId_normalizedAd_key" ON "Student"("institutionId", "normalizedAd");

-- CreateIndex
CREATE INDEX "Exam_institutionId_tarih_idx" ON "Exam"("institutionId", "tarih");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_institutionId_ad_tarih_key" ON "Exam"("institutionId", "ad", "tarih");

-- CreateIndex
CREATE INDEX "ExamResult_studentId_idx" ON "ExamResult"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_examId_studentId_key" ON "ExamResult"("examId", "studentId");

-- CreateIndex
CREATE INDEX "SubjectResult_examResultId_idx" ON "SubjectResult"("examResultId");

-- CreateIndex
CREATE INDEX "SubjectResult_dersGrubu_idx" ON "SubjectResult"("dersGrubu");

-- CreateIndex
CREATE INDEX "TopicResult_examResultId_idx" ON "TopicResult"("examResultId");

-- CreateIndex
CREATE INDEX "TopicResult_kazanim_idx" ON "TopicResult"("kazanim");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerSheet_examResultId_dersGrubu_key" ON "AnswerSheet"("examResultId", "dersGrubu");

