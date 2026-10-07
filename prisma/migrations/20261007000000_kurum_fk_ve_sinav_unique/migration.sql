-- Exam unique: TYT ve AYT ayni ad/tarihte ayri kayit olabilir.
DROP INDEX IF EXISTS "Exam_institutionId_ad_tarih_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Exam_institutionId_ad_tarih_sinavTuru_key" ON "Exam"("institutionId", "ad", "tarih", "sinavTuru");
CREATE INDEX IF NOT EXISTS "Exam_institutionId_sinavTuru_tarih_idx" ON "Exam"("institutionId", "sinavTuru", "tarih");

-- Kurum silinince takma ad ve veli karnesi de silinsin.
ALTER TABLE "StudentNameAlias" DROP CONSTRAINT IF EXISTS "StudentNameAlias_institutionId_fkey";
ALTER TABLE "StudentNameAlias" ADD CONSTRAINT "StudentNameAlias_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VeliKarne" DROP CONSTRAINT IF EXISTS "VeliKarne_institutionId_fkey";
ALTER TABLE "VeliKarne" ADD CONSTRAINT "VeliKarne_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
