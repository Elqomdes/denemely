import { prisma } from "@/lib/db";
import { ogrencileriCozumle } from "@/lib/ogrenci/eslestirme";
import { normalizePersonName } from "@/lib/pdf/parseUtils";
import type { ParsedExamFile, ParsedStudentPage } from "@/lib/pdf/types";

export type EslesmeDurumu = "mevcut" | "takma-ad" | "yeni" | "kopya";

export interface OnizlemeSatiri {
  sayfaNo: number;
  ad: string;
  normalizedAd: string;
  sinif: string | null;
  ogrenciNo: string | null;
  durum: EslesmeDurumu;
  mevcutOgrenciId: string | null;
  /** Takma ad ile eslesildiginde kurumda kayitli olan ad */
  mevcutAd: string | null;
  /** Kayitli sinif farkliysa gosterilir */
  mevcutSinif: string | null;
  puan: number | null;
  net: number;
  dersGrubuSayisi: number;
  kazanimSayisi: number;
  uyarilar: string[];
}

export interface Onizleme {
  satirlar: OnizlemeSatiri[];
  mevcutSayisi: number;
  takmaAdSayisi: number;
  yeniSayisi: number;
  kopyaSayisi: number;
  eksikBolumluSayisi: number;
  mevcutDeneme: { id: string; ad: string; sonucSayisi: number } | null;
}

/**
 * PDF'teki ogrencileri kurumdaki kayitlarla eslestirir.
 * Eslestirme, buyuk harfe cevrilmis ad uzerinden yapilir; ayni kurumda ayni
 * ada sahip iki ogrenci varsa "kopya" olarak isaretlenir ve kullaniciya bildirilir.
 */
export async function onizlemeHazirla(
  institutionId: string,
  parsed: ParsedExamFile,
  denemeAdi: string,
  tarih: Date,
): Promise<Onizleme> {
  const normalizedAdlar = parsed.ogrenciler.map((o) => normalizePersonName(o.ogrenciAdi));
  const mevcutHarita = await ogrencileriCozumle(institutionId, normalizedAdlar);

  const gorulen = new Set<string>();
  const satirlar: OnizlemeSatiri[] = parsed.ogrenciler.map((ogrenci) => {
    const normalizedAd = normalizePersonName(ogrenci.ogrenciAdi);
    const mevcut = mevcutHarita.get(normalizedAd) ?? null;

    let durum: EslesmeDurumu = "yeni";
    if (mevcut) durum = mevcut.yol === "takma-ad" ? "takma-ad" : "mevcut";
    if (gorulen.has(normalizedAd)) durum = "kopya";
    gorulen.add(normalizedAd);

    return {
      sayfaNo: ogrenci.pageNumber,
      ad: ogrenci.ogrenciAdi,
      normalizedAd,
      sinif: ogrenci.sinif,
      ogrenciNo: ogrenci.ogrenciNo,
      durum,
      mevcutOgrenciId: mevcut?.id ?? null,
      mevcutAd: mevcut && mevcut.yol === "takma-ad" ? mevcut.adSoyad : null,
      mevcutSinif: mevcut?.sinif ?? null,
      puan: ogrenci.puan,
      net: ogrenci.toplam.net,
      dersGrubuSayisi: ogrenci.dersler.filter((d) => d.isGrup).length,
      kazanimSayisi: ogrenci.kazanimlar.length,
      uyarilar: ogrenci.uyarilar,
    };
  });

  const mevcutDeneme = await prisma.exam.findUnique({
    where: { institutionId_ad_tarih: { institutionId, ad: denemeAdi, tarih } },
    select: { id: true, ad: true, _count: { select: { sonuclar: true } } },
  });

  return {
    satirlar,
    mevcutSayisi: satirlar.filter((s) => s.durum === "mevcut" || s.durum === "takma-ad").length,
    takmaAdSayisi: satirlar.filter((s) => s.durum === "takma-ad").length,
    yeniSayisi: satirlar.filter((s) => s.durum === "yeni").length,
    kopyaSayisi: satirlar.filter((s) => s.durum === "kopya").length,
    eksikBolumluSayisi: satirlar.filter((s) => s.dersGrubuSayisi < 4).length,
    mevcutDeneme: mevcutDeneme
      ? { id: mevcutDeneme.id, ad: mevcutDeneme.ad, sonucSayisi: mevcutDeneme._count.sonuclar }
      : null,
  };
}

/** PDF'ten okunan sinav adi yoksa dosya adindan makul bir isim uretir. */
export function varsayilanDenemeAdi(parsed: ParsedExamFile, dosyaAdi: string): string {
  if (parsed.sinavAdi) return parsed.sinavAdi.trim();
  return dosyaAdi.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || "Deneme Sınavı";
}

export function toplamKazanimSayisi(ogrenciler: ParsedStudentPage[]): number {
  return ogrenciler.reduce((toplam, ogrenci) => toplam + ogrenci.kazanimlar.length, 0);
}
