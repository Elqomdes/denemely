/**
 * "AKTİF TYT n" formati (ornek: samples/deneme_schema_2.pdf).
 *
 * Sayfa duzeni: ust blokta puan/yuzdelik dilim ve siralamalar, altta iki kolon
 * halinde ders tablolari + cevap satirlari + kazanim analizi ic ice.
 * Ders tablosu kolonlari: Soru | Dogru | Yanlis | Bos | Net | Basari%
 */
import { leftLines, rightLines, type PdfLine, type PdfPage } from "../extract";
import {
  alignToRuler,
  buildRuler,
  isDersGrubuAdi,
  isKeyToken,
  isStudentAnswerToken,
  normalizeGroupFlags,
  parseTrNumber,
  resolveDersGrubu,
  trailingNumbers,
} from "../parseUtils";
import type {
  ParsedAnswerSheet,
  ParsedStudentPage,
  ParsedSubject,
  ParsedTopic,
} from "../types";

export function parseAktifPage(page: PdfPage): ParsedStudentPage {
  const left = leftLines(page);
  const right = rightLines(page);
  const uyarilar: string[] = [];

  const kimlik = parseKimlik(left, uyarilar);
  const { siralar, katilimlar, yuzdelikDilim } = parseSiralamalar(page.lines, uyarilar);

  const dersler: ParsedSubject[] = [];
  const kazanimlar: ParsedTopic[] = [];
  const cevaplar: ParsedAnswerSheet[] = [];

  for (const band of [left, right]) {
    parseBand(band, dersler, kazanimlar, cevaplar, uyarilar);
  }
  normalizeGroupFlags(dersler);

  const toplam = hesaplaToplam(dersler, uyarilar);

  return {
    pageNumber: page.pageNumber,
    format: "AKTIF",
    sinavAdi: page.lines[0]?.text ?? null,
    kurumAdi: kimlik.kurumAdi,
    il: kimlik.il,
    ilce: kimlik.ilce,
    ogrenciAdi: kimlik.ogrenciAdi,
    ogrenciNo: kimlik.ogrenciNo,
    sinif: kimlik.sinif,
    puan: kimlik.puan,
    genelOrtalamaPuan: null,
    yuzdelikDilim,
    toplam,
    siralar,
    katilimlar,
    dersler,
    kazanimlar,
    cevaplar,
    uyarilar,
  };
}

function parseKimlik(left: PdfLine[], uyarilar: string[]) {
  let il: string | null = null;
  let ilce: string | null = null;
  let kurumAdi: string | null = null;
  let puan: number | null = null;

  const konumIndex = left.findIndex(
    (line, index) => index < 8 && line.text.split("/").length === 2,
  );
  if (konumIndex >= 0) {
    const [ilRaw, ilceRaw] = left[konumIndex].text.split("/");
    il = ilRaw.trim() || null;
    ilce = ilceRaw.trim() || null;
    kurumAdi = left[konumIndex + 1]?.text.trim() || null;
  } else {
    uyarilar.push("Il/ilce satiri bulunamadi.");
  }

  const puanSatiri = left.find(
    (line) => line.tokens.length === 1 && /^\d{1,3},\d{3}$/.test(line.tokens[0].text.trim()),
  );
  if (puanSatiri) puan = parseTrNumber(puanSatiri.tokens[0].text);
  else uyarilar.push("Puan okunamadi.");

  let ogrenciAdi = "";
  let ogrenciNo: string | null = null;
  let sinif: string | null = null;

  // "12-XX  -  0" satiri: sinif, ayirici tire ve ogrenci numarasi.
  const sinifIndex = left.findIndex(
    (line) =>
      line.tokens.length >= 2 &&
      line.tokens.some((t) => t.text.trim() === "-") &&
      /^\d{1,2}[-.\s]|mezun/i.test(line.tokens[0].text.trim()),
  );
  if (sinifIndex >= 0) {
    const tokens = left[sinifIndex].tokens;
    const tireIndex = tokens.findIndex((t) => t.text.trim() === "-");
    sinif =
      tokens
        .slice(0, tireIndex)
        .map((t) => t.text)
        .join(" ")
        .trim() || null;
    ogrenciNo =
      tokens
        .slice(tireIndex + 1)
        .map((t) => t.text)
        .join(" ")
        .trim() || null;

    const adSatiri = left[sinifIndex + 1];
    if (adSatiri) {
      const adTokenlari: string[] = [];
      for (const token of adSatiri.tokens) {
        if (parseTrNumber(token.text) !== null) break;
        adTokenlari.push(token.text);
      }
      ogrenciAdi = adTokenlari.join(" ").replace(/\s+/g, " ").trim();
    }
  }

  if (!ogrenciAdi) uyarilar.push("Ogrenci adi okunamadi.");

  return { il, ilce, kurumAdi, ogrenciAdi, ogrenciNo, sinif, puan };
}

function parseSiralamalar(lines: PdfLine[], uyarilar: string[]) {
  let siralar = { sinif: null, kurum: null, ilce: null, il: null, genel: null } as ParsedStudentPage["siralar"];
  let katilimlar = { ...siralar };
  let yuzdelikDilim: number | null = null;

  const siraSatiri = lines.find((line) => /Sıra No/i.test(line.text));
  if (siraSatiri) {
    const yuzdeToken = siraSatiri.tokens.find((t) => t.text.includes("%"));
    if (yuzdeToken) yuzdelikDilim = parseTrNumber(yuzdeToken.text);

    const degerler = siraSatiri.tokens
      .filter((t) => !t.text.includes("%"))
      .map((t) => parseTrNumber(t.text))
      .filter((v): v is number => v !== null);
    siralar = toRanks(degerler);
  } else {
    uyarilar.push("Siralama satiri bulunamadi.");
  }

  const katilimSatiri = lines.find((line) => /Katılan Öğrenci Sayısı/i.test(line.text));
  if (katilimSatiri) {
    const degerler = katilimSatiri.tokens
      .map((t) => parseTrNumber(t.text))
      .filter((v): v is number => v !== null);
    katilimlar = toRanks(degerler);
  } else {
    uyarilar.push("Katilim satiri bulunamadi.");
  }

  return { siralar, katilimlar, yuzdelikDilim };
}

function toRanks(values: number[]) {
  return {
    sinif: values[0] ?? null,
    kurum: values[1] ?? null,
    ilce: values[2] ?? null,
    il: values[3] ?? null,
    genel: values[4] ?? null,
  };
}

function parseBand(
  band: PdfLine[],
  dersler: ParsedSubject[],
  kazanimlar: ParsedTopic[],
  cevaplar: ParsedAnswerSheet[],
  uyarilar: string[],
) {
  let aktifDers: string | null = null;
  let sonGrup: string | null = null;

  for (let i = 0; i < band.length; i++) {
    const line = band[i];

    const dersSatiri = parseDersSatiri(line);
    if (dersSatiri) {
      dersler.push(dersSatiri);
      if (dersSatiri.isGrup) sonGrup = dersSatiri.dersGrubu;
      continue;
    }

    if (/Cevap Anahtarı/i.test(line.text)) {
      const cevap = parseCevapBlogu(band, i, sonGrup, uyarilar);
      if (cevap) cevaplar.push(cevap);
      continue;
    }

    const values = trailingNumbers(line, 4);
    if (!values) continue;

    const [soru, dogru, yanlis, basari] = values;
    const etiket = line.tokens
      .slice(0, line.tokens.length - 4)
      .map((t) => t.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Kazanim listesinde ders basliklari "Ders adi 0 0 0 0" olarak basiliyor;
    // gercek kazanim satirlarinda soru sayisi her zaman en az 1.
    if (soru === 0 && dogru === 0 && yanlis === 0 && basari === 0) {
      aktifDers = etiket || aktifDers;
      continue;
    }

    if (!aktifDers) continue;

    kazanimlar.push({
      dersAdi: aktifDers,
      dersGrubu: resolveDersGrubu(aktifDers),
      kazanim: etiket,
      soru,
      dogru,
      yanlis,
      basariYuzde: basari,
    });
  }
}

function parseDersSatiri(line: PdfLine): ParsedSubject | null {
  const yuzdeIndex = line.tokens.findIndex((t) => t.text.includes("%"));
  if (yuzdeIndex < 5) return null;

  const sayilar: number[] = [];
  for (let i = yuzdeIndex - 5; i < yuzdeIndex; i++) {
    const value = parseTrNumber(line.tokens[i].text);
    if (value === null) return null;
    sayilar.push(value);
  }

  const etiketTokenlari = line.tokens.slice(0, yuzdeIndex - 5);
  if (etiketTokenlari.length === 0) return null;
  if (parseTrNumber(etiketTokenlari[etiketTokenlari.length - 1].text) !== null) return null;

  const dersAdi = etiketTokenlari
    .map((t) => t.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const [soru, dogru, yanlis, bos, net] = sayilar;
  const basariYuzde = parseTrNumber(line.tokens[yuzdeIndex].text);

  return {
    dersAdi,
    dersGrubu: resolveDersGrubu(dersAdi),
    isGrup: isDersGrubuAdi(dersAdi),
    soru,
    dogru,
    yanlis,
    bos,
    net,
    basariYuzde,
    sinifOrt: null,
    kurumOrt: null,
    genelOrt: null,
  };
}

function parseCevapBlogu(
  band: PdfLine[],
  keyIndex: number,
  sonGrup: string | null,
  uyarilar: string[],
): ParsedAnswerSheet | null {
  const keyLine = band[keyIndex];
  const keyTokens = keyLine.tokens.filter(isKeyToken);
  const ruler = buildRuler(keyTokens);
  if (!ruler || ruler.length < 5) {
    uyarilar.push("Cevap anahtari satiri okunamadi.");
    return null;
  }

  const cevapAnahtari = alignToRuler(keyTokens, ruler);
  const kitapcik =
    keyLine.tokens.find((t) => /^[A-E]$/.test(t.text.trim()) && t.x < ruler.originX - 1)?.text.trim() ??
    null;

  // Bu formatta ogrenci cevaplari anahtarin bir altinda "Cevaplarınız" satirinda.
  let ogrenciCevaplari = " ".repeat(ruler.length);
  const ogrenciSatiri = band
    .slice(keyIndex + 1, keyIndex + 3)
    .find((line) => /Cevaplarınız/i.test(line.text));
  if (ogrenciSatiri) {
    const tokens = ogrenciSatiri.tokens.filter(
      (t) => t.x >= ruler.originX - ruler.pitch / 2 && isStudentAnswerToken(t),
    );
    if (tokens.length > 0) ogrenciCevaplari = alignToRuler(tokens, ruler);
  } else {
    uyarilar.push("Ogrenci cevap satiri bulunamadi.");
  }

  return {
    dersGrubu: sonGrup ?? "Bilinmiyor",
    kitapcik,
    cevapAnahtari,
    ogrenciCevaplari,
  };
}

function hesaplaToplam(dersler: ParsedSubject[], uyarilar: string[]): ParsedStudentPage["toplam"] {
  const gruplar = dersler.filter((d) => d.isGrup);
  if (gruplar.length === 0) {
    uyarilar.push("Ders grubu toplamlari bulunamadi.");
    return {
      soru: 0,
      dogru: 0,
      yanlis: 0,
      bos: 0,
      net: 0,
      basariYuzde: null,
      sinifOrt: null,
      kurumOrt: null,
      genelOrt: null,
    };
  }

  const soru = gruplar.reduce((s, d) => s + d.soru, 0);
  const dogru = gruplar.reduce((s, d) => s + d.dogru, 0);
  const yanlis = gruplar.reduce((s, d) => s + d.yanlis, 0);
  const bos = gruplar.reduce((s, d) => s + d.bos, 0);
  const net = Math.round(gruplar.reduce((s, d) => s + d.net, 0) * 100) / 100;

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
