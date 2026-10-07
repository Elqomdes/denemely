import { openaiAnahtari } from "../openai/client";
import { DesteklenmeyenFormatHatasi, detectFormat } from "./detect";
import { extractPdfPages, type PdfPage } from "./extract";
import { parseAkbimPage } from "./formats/akbim";
import { parseAktifPage } from "./formats/aktif";
import { parseSonucBelgesiPage } from "./formats/sonucBelgesi";
import { yeniSablonOgren, profilliAyristir, ProfilOgrenmeHatasi } from "./profile/learn";
import { eslesenProfil } from "./profile/store";
import type { ExamFormat, ParsedExamFile, ParsedStudentPage } from "./types";
/**
 * Bir deneme sonuc PDF'ini ayristirir. Her sayfa bir ogrencinin karnesidir.
 * Bilinen uc format gomulu parser ile okunur. Taninmayan yayinlarda once
 * kayitli profiller, yoksa GPT-5.6 Sol ile yeni sablon ogrenilir.
 */
export async function parseExamPdf(
  data: Uint8Array,
  dosyaAdi?: string,
): Promise<ParsedExamFile> {
  const pages = await extractPdfPages(data);
  if (pages.length === 0) throw new DesteklenmeyenFormatHatasi(dosyaAdi);
  const format = detectFormat(pages[0]);
  if (format) return gomuluAyristir(format, pages);
  const kayitli = await eslesenProfil(pages[0]);
  if (kayitli) return profilliAyristir(pages, kayitli);
  if (!openaiAnahtari()) throw new DesteklenmeyenFormatHatasi(dosyaAdi);
  return (await yeniSablonOgren(pages, dosyaAdi)).parsed;
}
export { ProfilOgrenmeHatasi };
function gomuluAyristir(format: ExamFormat, pages: PdfPage[]): ParsedExamFile {
  const uyarilar: string[] = [];
  const ogrenciler: ParsedStudentPage[] = [];
  for (const page of pages) {
    const parsed = parsePage(format, page);
    if (!parsed.ogrenciAdi) {
      uyarilar.push(`${page.pageNumber}. sayfada ogrenci adi okunamadi, sayfa atlandi.`);
      continue;
    }
    ogrenciler.push(parsed);
  }
  return {
    format,
    sinavAdi: enCokTekrarEden(ogrenciler.map((o) => o.sinavAdi)),
    ogrenciler,
    uyarilar,
  };
}
function parsePage(format: ExamFormat, page: PdfPage) {
  if (format === "SONUC_BELGESI") return parseSonucBelgesiPage(page);
  if (format === "AKTIF") return parseAktifPage(page);
  return parseAkbimPage(page);
}
function enCokTekrarEden(values: Array<string | null>): string | null {
  const sayim = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    sayim.set(value, (sayim.get(value) ?? 0) + 1);
  }
  let enIyi: string | null = null;
  let enIyiAdet = 0;
  for (const [value, adet] of sayim) {
    if (adet > enIyiAdet) {
      enIyi = value;
      enIyiAdet = adet;
    }
  }
  return enIyi;
}
