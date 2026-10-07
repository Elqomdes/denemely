/** Yayin formatlarinin ortak ayristirma cikti tipleri. */

export type ExamFormat = "SONUC_BELGESI" | "AKTIF" | "AKBIM" | "PROFIL";

export const EXAM_FORMAT_LABELS: Record<ExamFormat, string> = {
  SONUC_BELGESI: "Sonuc Belgesi",
  AKTIF: "Aktif",
  AKBIM: "Akbim",
  PROFIL: "Ogrenilen sablon",
};

/** Veritabaninda `PROFIL:Limit TYT` gibi yazilan ogrenilmis sablonlari da cozer. */
export function formatEtiketi(format: string): string {
  if (format.startsWith("PROFIL:")) return format.slice(7) || EXAM_FORMAT_LABELS.PROFIL;
  return EXAM_FORMAT_LABELS[format as ExamFormat] ?? format;
}

/** TYT ve AYT ders gruplari (deneme belgelerindeki yazimlariyla) */
export const DERS_GRUPLARI = [
  "TYT Türkçe",
  "TYT Sosyal",
  "TYT Matematik",
  "TYT Fen",
  "AYT Edebiyat",
  "AYT Sosyal",
  "AYT Matematik",
  "AYT Fen",
] as const;

export type DersGrubu = (typeof DERS_GRUPLARI)[number];

export interface ParsedSubject {
  dersAdi: string;
  dersGrubu: string;
  /** "TYT Sosyal" gibi grup toplami satirlari (ders toplamlari alt derslerin toplamina esit olmayabilir) */
  isGrup: boolean;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  net: number;
  basariYuzde: number | null;
  sinifOrt: number | null;
  kurumOrt: number | null;
  genelOrt: number | null;
}

export interface ParsedTopic {
  dersAdi: string;
  dersGrubu: string;
  kazanim: string;
  soru: number;
  dogru: number;
  yanlis: number;
  basariYuzde: number | null;
}

export interface ParsedAnswerSheet {
  dersGrubu: string;
  kitapcik: string | null;
  /** Uzunlugu soru sayisi kadar; A–E dogru secenek, T iptal soru */
  cevapAnahtari: string;
  /**
   * Ayni uzunlukta ogrenci cevap dizisi.
   * Buyuk harf = dogru, kucuk harf = yanlis, bosluk = bos birakilmis.
   */
  ogrenciCevaplari: string;
}

export interface ParsedTotals {
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  net: number;
  basariYuzde: number | null;
  sinifOrt: number | null;
  kurumOrt: number | null;
  genelOrt: number | null;
}

export interface ParsedRanks {
  sinif: number | null;
  kurum: number | null;
  ilce: number | null;
  il: number | null;
  genel: number | null;
}

export interface ParsedStudentPage {
  pageNumber: number;
  format: ExamFormat;
  sinavAdi: string | null;
  kurumAdi: string | null;
  il: string | null;
  ilce: string | null;
  ogrenciAdi: string;
  ogrenciNo: string | null;
  sinif: string | null;
  puan: number | null;
  /** Format 1: genel puan ortalamasi */
  genelOrtalamaPuan: number | null;
  /** Format 2: yuzdelik dilim */
  yuzdelikDilim: number | null;
  toplam: ParsedTotals;
  siralar: ParsedRanks;
  katilimlar: ParsedRanks;
  dersler: ParsedSubject[];
  kazanimlar: ParsedTopic[];
  cevaplar: ParsedAnswerSheet[];
  /** Ayristirma sirasinda atlanan/emin olunamayan noktalar */
  uyarilar: string[];
}

export interface ParsedExamFile {
  format: ExamFormat;
  sinavAdi: string | null;
  ogrenciler: ParsedStudentPage[];
  uyarilar: string[];
  profilId?: string | null;
  profilAdi?: string | null;
}
