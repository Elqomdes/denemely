import { cache } from "react";
import { prisma } from "@/lib/db";
import { normalizePersonName } from "@/lib/pdf/parseUtils";
import { adaylariBul, type AdayOgrenci, type BirlestirmeAdayi } from "./benzerlik";

/** Ikili her zaman ayni sirada saklanir, boylece yoksayma kaydi tek olur. */
function ikiliAnahtari(aId: string, bId: string): [string, string] {
  return aId < bId ? [aId, bId] : [bId, aId];
}

/** Kurumdaki tum ogrencileri deneme kimlikleriyle birlikte getirip adaylari hesaplar. */
export const birlestirmeAdaylari = cache(async (institutionId: string): Promise<BirlestirmeAdayi[]> => {
  const [ogrenciler, yoksaymalar] = await Promise.all([
    prisma.student.findMany({
      where: { institutionId },
      select: {
        id: true,
        adSoyad: true,
        sinif: true,
        ogrenciNo: true,
        sonuclar: { select: { examId: true } },
      },
    }),
    prisma.studentMergeIgnore.findMany({
      where: { institutionId },
      select: { ogrenciAId: true, ogrenciBId: true },
    }),
  ]);

  const yoksayilan = new Set(
    yoksaymalar.map((kayit) => `${kayit.ogrenciAId}|${kayit.ogrenciBId}`),
  );

  const adaylar: AdayOgrenci[] = ogrenciler.map((ogrenci) => ({
    id: ogrenci.id,
    adSoyad: ogrenci.adSoyad,
    sinif: ogrenci.sinif,
    ogrenciNo: ogrenci.ogrenciNo,
    denemeSayisi: ogrenci.sonuclar.length,
    denemeIdleri: ogrenci.sonuclar.map((sonuc) => sonuc.examId),
  }));

  return adaylariBul(adaylar).filter((aday) => {
    const [a, b] = ikiliAnahtari(aday.hedef.id, aday.kaynak.id);
    return !yoksayilan.has(`${a}|${b}`);
  });
});

/** "Bu ikisi ayni kisi degil" isareti; oneri listesinde bir daha gosterilmez. */
export async function farkliKisilerOlarakIsaretle(
  institutionId: string,
  birinciId: string,
  ikinciId: string,
): Promise<void> {
  const [ogrenciAId, ogrenciBId] = ikiliAnahtari(birinciId, ikinciId);

  const ikisiDeKurumda = await prisma.student.count({
    where: { institutionId, id: { in: [ogrenciAId, ogrenciBId] } },
  });
  if (ikisiDeKurumda !== 2) throw new Error("Öğrenci kaydı bulunamadı.");

  await prisma.studentMergeIgnore.upsert({
    where: {
      institutionId_ogrenciAId_ogrenciBId: { institutionId, ogrenciAId, ogrenciBId },
    },
    update: {},
    create: { institutionId, ogrenciAId, ogrenciBId },
  });
}

export interface BirlestirmeSonucu {
  tasinanSonuc: number;
  silinenSonuc: number;
  korunanAd: string;
}

/**
 * Iki ogrenci kaydini tek kayitta birlestirir.
 * Kaynak kaydin deneme sonuclari hedefe tasinir; ayni denemede iki kayit da
 * varsa (ki normalde olmaz) kaynaktaki sonuc silinir. Kaynak kayit kaldirilir.
 */
export async function ogrencileriBirlestir({
  institutionId,
  hedefId,
  kaynakId,
  korunacakAd = "hedef",
}: {
  institutionId: string;
  hedefId: string;
  kaynakId: string;
  korunacakAd?: "hedef" | "kaynak";
}): Promise<BirlestirmeSonucu> {
  if (hedefId === kaynakId) throw new Error("Aynı kayıt kendisiyle birleştirilemez.");

  const [hedef, kaynak] = await Promise.all([
    prisma.student.findFirst({
      where: { id: hedefId, institutionId },
      select: {
        id: true,
        adSoyad: true,
        sinif: true,
        ogrenciNo: true,
        sonuclar: { select: { id: true, examId: true } },
      },
    }),
    prisma.student.findFirst({
      where: { id: kaynakId, institutionId },
      select: {
        id: true,
        adSoyad: true,
        sinif: true,
        ogrenciNo: true,
        sonuclar: { select: { id: true, examId: true } },
      },
    }),
  ]);

  if (!hedef || !kaynak) throw new Error("Öğrenci kaydı bulunamadı.");

  const hedefDenemeleri = new Set(hedef.sonuclar.map((sonuc) => sonuc.examId));
  const tasinacak = kaynak.sonuclar.filter((sonuc) => !hedefDenemeleri.has(sonuc.examId));
  const silinecek = kaynak.sonuclar.filter((sonuc) => hedefDenemeleri.has(sonuc.examId));

  const yeniAd = korunacakAd === "kaynak" ? kaynak.adSoyad : hedef.adSoyad;
  const yeniNormalizedAd = normalizePersonName(yeniAd);

  // Kaldirilan kaydin yazimi ve varsa onceki takma adlari, hedefe takma ad
  // olarak baglanir. Boylece ogrenci sonraki denemede yine ayni sekilde
  // kodlarsa kopya kayit olusmaz.
  const kaynakTakmaAdlari = await prisma.studentNameAlias.findMany({
    where: { studentId: kaynak.id },
    select: { normalizedAd: true },
  });
  const takmaAdlar = new Set<string>([
    normalizePersonName(kaynak.adSoyad),
    normalizePersonName(hedef.adSoyad),
    ...kaynakTakmaAdlari.map((takma) => takma.normalizedAd),
  ]);
  takmaAdlar.delete(yeniNormalizedAd);

  await prisma.$transaction(async (tx) => {
    if (silinecek.length > 0) {
      await tx.examResult.deleteMany({
        where: { id: { in: silinecek.map((sonuc) => sonuc.id) } },
      });
    }

    if (tasinacak.length > 0) {
      await tx.examResult.updateMany({
        where: { id: { in: tasinacak.map((sonuc) => sonuc.id) } },
        data: { studentId: hedef.id },
      });
    }

    // Once kaynak siliniyor: ad korunurken normalizedAd tekillik kisiti cakismasin.
    await tx.student.delete({ where: { id: kaynak.id } });

    await tx.student.update({
      where: { id: hedef.id },
      data: {
        adSoyad: yeniAd,
        normalizedAd: yeniNormalizedAd,
        sinif: hedef.sinif ?? kaynak.sinif,
        ogrenciNo: hedef.ogrenciNo ?? kaynak.ogrenciNo,
      },
    });

    for (const takmaAd of takmaAdlar) {
      await tx.studentNameAlias.upsert({
        where: {
          institutionId_normalizedAd: { institutionId, normalizedAd: takmaAd },
        },
        update: { studentId: hedef.id },
        create: { institutionId, studentId: hedef.id, normalizedAd: takmaAd },
      });
    }
  });

  return {
    tasinanSonuc: tasinacak.length,
    silinenSonuc: silinecek.length,
    korunanAd: yeniAd,
  };
}

export interface GuncellemeGirdisi {
  institutionId: string;
  id: string;
  adSoyad: string;
  sinif: string | null;
  ogrenciNo: string | null;
}

/** Ad, sinif ve numara duzeltmesi. Ayni ada sahip baska kayit varsa uyarir. */
export async function ogrenciGuncelle(girdi: GuncellemeGirdisi): Promise<{ cakisanId?: string }> {
  const normalizedAd = normalizePersonName(girdi.adSoyad);

  const [cakisan, mevcut] = await Promise.all([
    prisma.student.findFirst({
      where: {
        institutionId: girdi.institutionId,
        normalizedAd,
        id: { not: girdi.id },
      },
      select: { id: true },
    }),
    prisma.student.findUnique({
      where: { id: girdi.id },
      select: { normalizedAd: true },
    }),
  ]);
  if (cakisan) return { cakisanId: cakisan.id };

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: girdi.id },
      data: {
        adSoyad: girdi.adSoyad,
        normalizedAd,
        sinif: girdi.sinif,
        ogrenciNo: girdi.ogrenciNo,
      },
    });

    // Eski yazim takma ad olarak saklanir: optik formda ayni sekilde
    // kodlanmaya devam ederse yeni kayit acilmasin.
    if (mevcut && mevcut.normalizedAd !== normalizedAd) {
      await tx.studentNameAlias.upsert({
        where: {
          institutionId_normalizedAd: {
            institutionId: girdi.institutionId,
            normalizedAd: mevcut.normalizedAd,
          },
        },
        update: { studentId: girdi.id },
        create: {
          institutionId: girdi.institutionId,
          studentId: girdi.id,
          normalizedAd: mevcut.normalizedAd,
        },
      });
    }
  });

  return {};
}

/** Elle birlestirmede hedef secmek icin kurumdaki diger ogrenciler. */
export async function birlestirilebilirOgrenciler(institutionId: string, haricId: string) {
  const ogrenciler = await prisma.student.findMany({
    where: { institutionId, id: { not: haricId } },
    select: {
      id: true,
      adSoyad: true,
      sinif: true,
      _count: { select: { sonuclar: true } },
    },
  });

  return ogrenciler
    .map((ogrenci) => ({
      id: ogrenci.id,
      adSoyad: ogrenci.adSoyad,
      sinif: ogrenci.sinif,
      denemeSayisi: ogrenci._count.sonuclar,
    }))
    .sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"));
}
