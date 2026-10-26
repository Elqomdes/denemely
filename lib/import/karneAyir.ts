import { AYT_GRUP_SET, TYT_GRUP_SET, grupKumesi, type SinavTuru } from "@/lib/sinav";
import type {
  AlanPuani,
  ParsedExamFile,
  ParsedRanks,
  ParsedStudentPage,
  ParsedSubject,
} from "@/lib/pdf/types";

function gruplardanToplam(dersler: ParsedSubject[]): ParsedStudentPage["toplam"] {
  const gruplar = dersler.filter((d) => d.isGrup);
  const kaynak = gruplar.length > 0 ? gruplar : dersler;
  const soru = kaynak.reduce((s, d) => s + d.soru, 0);
  const dogru = kaynak.reduce((s, d) => s + d.dogru, 0);
  const yanlis = kaynak.reduce((s, d) => s + d.yanlis, 0);
  const bos = kaynak.reduce((s, d) => s + d.bos, 0);
  const net = Math.round(kaynak.reduce((s, d) => s + d.net, 0) * 100) / 100;
  return {
    soru,
    dogru,
    yanlis,
    bos,
    net,
    basariYuzde: soru > 0 ? Math.round((net / soru) * 1000) / 10 : null,
    sinifOrt: null,
    kurumOrt: null,
    genelOrt: null,
  };
}

function alinanGrup(dersler: ParsedSubject[], grup: string) {
  return dersler.some((d) => d.dersGrubu === grup && (d.dogru > 0 || d.yanlis > 0));
}

/** Öğrencinin işaretlediği AYT testine göre SAY / EA / SÖZ / DİL. */
export function aytAlaniniSec(dersler: ParsedSubject[]): Exclude<AlanPuani, "TYT"> {
  const mat = alinanGrup(dersler, "AYT Matematik");
  const fen = alinanGrup(dersler, "AYT Fen");
  const edeb = alinanGrup(dersler, "AYT Edebiyat");
  const sos = alinanGrup(dersler, "AYT Sosyal");
  const dil = alinanGrup(dersler, "AYT Dil");
  if (mat && fen) return "SAY";
  if (mat && edeb) return "EA";
  if (edeb && sos && !fen) return "SÖZ";
  if (dil && !mat && !fen) return "DİL";
  if (fen || mat) return "SAY";
  if (edeb) return "SÖZ";
  if (dil) return "DİL";
  return "SAY";
}

function bosRanks(): ParsedRanks {
  return { sinif: null, kurum: null, ilce: null, il: null, genel: null };
}

function ogrenciyiAyir(ogrenci: ParsedStudentPage, tur: SinavTuru): ParsedStudentPage | null {
  const kume = grupKumesi(tur);
  let dersler = ogrenci.dersler.filter((d) => kume.has(d.dersGrubu));
  if (tur === "AYT") {
    const alinanGruplar = new Set(
      dersler.filter((d) => d.dogru > 0 || d.yanlis > 0).map((d) => d.dersGrubu),
    );
    dersler = dersler.filter((d) => alinanGruplar.has(d.dersGrubu));
  }
  if (dersler.length === 0) return null;

  const alan = tur === "TYT" ? "TYT" : aytAlaniniSec(dersler);
  const puan =
    ogrenci.alanPuanlari?.[alan] ?? (tur === "TYT" ? ogrenci.puan : ogrenci.alanPuanlari?.SAY ?? null);
  const siralar = ogrenci.alanSiralar?.[alan] ?? (tur === "TYT" ? ogrenci.siralar : bosRanks());

  return {
    ...ogrenci,
    puan,
    siralar,
    katilimlar: tur === "TYT" ? ogrenci.katilimlar : bosRanks(),
    toplam: gruplardanToplam(dersler),
    dersler,
    kazanimlar: ogrenci.kazanimlar.filter(
      (k) => kume.has(k.dersGrubu) && dersler.some((d) => d.dersGrubu === k.dersGrubu),
    ),
    cevaplar: ogrenci.cevaplar.filter(
      (c) => kume.has(c.dersGrubu) && dersler.some((d) => d.dersGrubu === c.dersGrubu),
    ),
  };
}

/** Karnede hem TYT hem AYT bölümü (soru > 0) varsa ortak belgedir. */
export function karneKarisikMi(parsed: ParsedExamFile): boolean {
  return parsed.ogrenciler.some((ogrenci) => {
    const gruplar = new Set(ogrenci.dersler.map((d) => d.dersGrubu));
    return [...gruplar].some((g) => TYT_GRUP_SET.has(g)) && [...gruplar].some((g) => AYT_GRUP_SET.has(g));
  });
}

export function sinavaGoreKarne(parsed: ParsedExamFile, tur: SinavTuru): ParsedExamFile {
  return {
    ...parsed,
    ogrenciler: parsed.ogrenciler
      .map((ogrenci) => ogrenciyiAyir(ogrenci, tur))
      .filter((ogrenci): ogrenci is ParsedStudentPage => ogrenci !== null),
  };
}
