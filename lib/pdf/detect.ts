import type { PdfPage } from "./extract";
import type { ExamFormat } from "./types";

/**
 * Ilk sayfanin metnine bakarak yayin formatini belirler.
 * Taninmayan formatlar bilerek reddedilir; yanlis ayristirmak veri kirletir.
 */
export function detectFormat(page: PdfPage): ExamFormat | null {
  const metin = page.lines.map((line) => line.text).join("\n");

  // Akbim "SINAV SONUÇ BELGESİ" ifadesi genel Sonuç Belgesi kalıbından önce bakılmalı.
  if (
    /SINAV\s+SONUÇ\s+BELGES/i.test(metin) &&
    (/MEB\s*KODU/i.test(metin) || /Akbim/i.test(metin) || /SOYADI\s*-\s*ADI/i.test(metin))
  ) {
    return "AKBIM";
  }

  if (/SONUÇ\s+BELGES/i.test(metin)) return "SONUC_BELGESI";
  if (/Cevaplarınız/i.test(metin) && /Katılan Öğrenci Sayısı/i.test(metin)) return "AKTIF";

  // Ders tablosu kolon basliklarina gore ikinci bir deneme
  if (/Sınıf\s*Ort/i.test(metin) && /Kurum\s*Ort/i.test(metin)) return "SONUC_BELGESI";
  if (/Cevaplarınız/i.test(metin)) return "AKTIF";

  return null;
}

export class DesteklenmeyenFormatHatasi extends Error {
  constructor(public readonly dosyaAdi?: string) {
    super(
      "Bu yayinin sonuc belgesi formati henuz desteklenmiyor. Lutfen dosyayi Hedefly ekibine iletin.",
    );
    this.name = "DesteklenmeyenFormatHatasi";
  }
}
