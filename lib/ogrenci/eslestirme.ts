import { prisma } from "@/lib/db";
import { normalizePersonName } from "@/lib/pdf/parseUtils";

export type EslesmeYolu = "ad" | "takma-ad";

export interface EslesenOgrenci {
  id: string;
  adSoyad: string;
  sinif: string | null;
  /** "ad": kayitli ad birebir tutti, "takma-ad": daha once birlestirilmis bir yazim */
  yol: EslesmeYolu;
}

/**
 * PDF'ten okunan adlari kurumdaki kayitlarla eslestirir.
 *
 * Once kayitli ada, sonra takma adlara bakilir. Takma adlar birlestirme
 * sirasinda olusuyor: ogrenci bir denemede "ALİ GÜLER", digerinde
 * "ALİ METEHAN GÜLER" kodladiysa ve bu ikisi birlestirildiyse, sonraki
 * yuklemelerde kisa yazim dogrudan ayni ogrenciye baglanir.
 */
export async function ogrencileriCozumle(
  institutionId: string,
  normalizedAdlar: string[],
): Promise<Map<string, EslesenOgrenci>> {
  const tekilAdlar = [...new Set(normalizedAdlar)];
  if (tekilAdlar.length === 0) return new Map();

  const [ogrenciler, takmaAdlar] = await Promise.all([
    prisma.student.findMany({
      where: { institutionId, normalizedAd: { in: tekilAdlar } },
      select: { id: true, adSoyad: true, sinif: true, normalizedAd: true },
    }),
    prisma.studentNameAlias.findMany({
      where: { institutionId, normalizedAd: { in: tekilAdlar } },
      select: {
        normalizedAd: true,
        student: { select: { id: true, adSoyad: true, sinif: true } },
      },
    }),
  ]);

  const harita = new Map<string, EslesenOgrenci>();

  // Takma adlar once yaziliyor, kayitli ad eslesmesi gerektiginde uzerine yazar.
  for (const takma of takmaAdlar) {
    harita.set(takma.normalizedAd, {
      id: takma.student.id,
      adSoyad: takma.student.adSoyad,
      sinif: takma.student.sinif,
      yol: "takma-ad",
    });
  }

  for (const ogrenci of ogrenciler) {
    harita.set(ogrenci.normalizedAd, {
      id: ogrenci.id,
      adSoyad: ogrenci.adSoyad,
      sinif: ogrenci.sinif,
      yol: "ad",
    });
  }

  return harita;
}

export interface CozumlemeSonucu {
  studentId: string;
  yeniMi: boolean;
}

/**
 * Ice aktarma sirasinda tek bir ogrenciyi cozumler; yoksa olusturur.
 *
 * Takma ad uzerinden eslesen kayitlarda ogrencinin adi DEGISTIRILMEZ: kurum
 * birlestirme sirasinda hangi yazimin korunacagina karar vermistir.
 */
export async function ogrenciCozumleVeyaOlustur({
  institutionId,
  adSoyad,
  sinif,
  ogrenciNo,
}: {
  institutionId: string;
  adSoyad: string;
  sinif: string | null;
  ogrenciNo: string | null;
}): Promise<CozumlemeSonucu> {
  const normalizedAd = normalizePersonName(adSoyad);
  const harita = await ogrencileriCozumle(institutionId, [normalizedAd]);
  const eslesen = harita.get(normalizedAd);

  if (eslesen) {
    await prisma.student.update({
      where: { id: eslesen.id },
      data: {
        // Kayitli ad yalnizca birebir eslesmede tazelenir.
        adSoyad: eslesen.yol === "ad" ? adSoyad : undefined,
        sinif: sinif ?? undefined,
        ogrenciNo: ogrenciNo ?? undefined,
      },
    });
    return { studentId: eslesen.id, yeniMi: false };
  }

  const yeni = await prisma.student.create({
    data: { institutionId, adSoyad, normalizedAd, sinif, ogrenciNo },
    select: { id: true },
  });
  return { studentId: yeni.id, yeniMi: true };
}
