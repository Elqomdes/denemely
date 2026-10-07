/**
 * "SONUÇ BELGESİ ... DENEME SINAVI" formati (ornek: samples/deneme_schema_1.pdf).
 *
 * Sayfa duzeni: sol kolonda kimlik bilgileri, puan/derece blogu, ders tablosu ve
 * cevap satirlari; sag kolonda derslere gore kazanim analizi.
 * Ders tablosu kolonlari: Soru | Dogru | Yanlis | Net | Basari% | Sinif Ort | Kurum Ort | Genel Ort
 */
import { leftLines, rightLines, type PdfLine, type PdfPage } from "../extract";
import {
  alignToRuler,
  buildRuler,
  hesaplaNet,
  isDersGrubuAdi,
  isKeyToken,
  isStudentAnswerToken,
  labelOf,
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

const DERS_SATIR_SAYI_ADEDI = 8;

export function parseSonucBelgesiPage(page: PdfPage): ParsedStudentPage {
  const left = leftLines(page);
  const right = rightLines(page);
  const uyarilar: string[] = [];

  const kimlik = parseKimlik(left, uyarilar);
  const puanBlogu = parsePuanBlogu(left, uyarilar);
  const { dersler, toplam } = parseDersTablosu(left, uyarilar);
  const cevaplar = parseCevaplar(left, uyarilar);
  const kazanimlar = parseKazanimlar(right);

  return {
    pageNumber: page.pageNumber,
    format: "SONUC_BELGESI",
    sinavAdi: parseSinavAdi(right),
    kurumAdi: kimlik.kurumAdi,
    il: kimlik.il,
    ilce: kimlik.ilce,
    ogrenciAdi: kimlik.ogrenciAdi,
    ogrenciNo: kimlik.ogrenciNo,
    sinif: kimlik.sinif,
    puan: puanBlogu.puan,
    genelOrtalamaPuan: puanBlogu.genelOrtalamaPuan,
    yuzdelikDilim: null,
    toplam,
    siralar: puanBlogu.siralar,
    katilimlar: puanBlogu.katilimlar,
    dersler,
    kazanimlar,
    cevaplar,
    uyarilar,
  };
}

function parseSinavAdi(right: PdfLine[]): string | null {
  for (const line of right.slice(0, 3)) {
    if (/sinav|sınav|deneme|tyt|ayt/i.test(line.text)) return line.text;
  }
  return null;
}

function parseKimlik(left: PdfLine[], uyarilar: string[]) {
  let il: string | null = null;
  let ilce: string | null = null;
  let kurumAdi: string | null = null;

  const konumSatiri = left.slice(0, 4).find((line) => line.text.split("/").length >= 3);
  if (konumSatiri) {
    const parcalar = konumSatiri.text.split("/").map((p) => p.trim());
    il = parcalar[0] ?? null;
    ilce = parcalar[1] ?? null;
    kurumAdi = parcalar.slice(2).join(" / ") || null;
  } else {
    uyarilar.push("Il/ilce/kurum satiri bulunamadi.");
  }

  let ogrenciAdi = "";
  let ogrenciNo: string | null = null;
  let sinif: string | null = null;

  const baslikIndex = left.findIndex(
    (line) => /Öğrenci/i.test(line.text) && /Numara/i.test(line.text) && /Sınıf/i.test(line.text),
  );
  if (baslikIndex >= 0 && baslikIndex + 1 < left.length) {
    const baslik = left[baslikIndex];
    const veri = left[baslikIndex + 1];
    const numaraX = baslik.tokens.find((t) => /Numara/i.test(t.text))?.x ?? Infinity;
    const sinifX = baslik.tokens.find((t) => /Sınıf/i.test(t.text))?.x ?? Infinity;
    // Kolon basliklarinin x konumuna gore ayirmak, adin bosluk icermesine dayaniklidir.
    const sinir = (x: number) => x + 6;

    ogrenciAdi = veri.tokens
      .filter((t) => t.x < sinir(numaraX) - 6)
      .map((t) => t.text)
      .join(" ")
      .trim();
    ogrenciNo =
      veri.tokens
        .filter((t) => t.x >= numaraX - 6 && t.x < sinifX - 6)
        .map((t) => t.text)
        .join(" ")
        .trim() || null;
    sinif =
      veri.tokens
        .filter((t) => t.x >= sinifX - 6)
        .map((t) => t.text)
        .join(" ")
        .trim() || null;
  }

  if (!ogrenciAdi) uyarilar.push("Ogrenci adi okunamadi.");

  return { il, ilce, kurumAdi, ogrenciAdi, ogrenciNo, sinif };
}

function bosRanks() {
  return { sinif: null, kurum: null, ilce: null, il: null, genel: null };
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

function parsePuanBlogu(left: PdfLine[], uyarilar: string[]) {
  const katilimIndex = left.findIndex((line) => /^Katılımlar/i.test(line.text));
  if (katilimIndex < 0) {
    uyarilar.push("Puan/derece blogu bulunamadi.");
    return {
      puan: null,
      genelOrtalamaPuan: null,
      siralar: bosRanks(),
      katilimlar: bosRanks(),
    };
  }

  const katilimSatiri = left[katilimIndex];
  const katilimDegerleri = katilimSatiri.tokens
    .map((t) => parseTrNumber(t.text))
    .filter((v): v is number => v !== null);

  const puanSatiri = left[katilimIndex - 1];
  const puanDegerleri =
    puanSatiri?.tokens.map((t) => parseTrNumber(t.text)).filter((v): v is number => v !== null) ??
    [];

  // [puan, genel ortalama, snf, kurum, ilce, il, genel]
  const puan = puanDegerleri[0] ?? null;
  const genelOrtalamaPuan = puanDegerleri[1] ?? null;
  const siralar = toRanks(puanDegerleri.slice(2));

  return {
    puan,
    genelOrtalamaPuan,
    siralar,
    katilimlar: toRanks(katilimDegerleri),
  };
}

function parseDersTablosu(left: PdfLine[], uyarilar: string[]) {
  const dersler: ParsedSubject[] = [];
  let toplam: ParsedStudentPage["toplam"] | null = null;

  for (const line of left) {
    const values = trailingNumbers(line, DERS_SATIR_SAYI_ADEDI);
    if (!values) continue;

    const label = labelOf(line, DERS_SATIR_SAYI_ADEDI);
    const [soru, dogru, yanlis, net, basari, sinifOrt, kurumOrt, genelOrt] = values;
    const bos = Math.max(0, soru - dogru - yanlis);

    if (/^Toplam/i.test(label)) {
      toplam = {
        soru,
        dogru,
        yanlis,
        bos,
        net,
        basariYuzde: basari,
        sinifOrt,
        kurumOrt,
        genelOrt,
      };
      continue;
    }

    dersler.push({
      dersAdi: label,
      dersGrubu: resolveDersGrubu(label),
      isGrup: isDersGrubuAdi(label),
      soru,
      dogru,
      yanlis,
      bos,
      net,
      basariYuzde: basari,
      sinifOrt,
      kurumOrt,
      genelOrt,
    });
  }

  if (dersler.length === 0) uyarilar.push("Ders tablosu okunamadi.");
  normalizeGroupFlags(dersler);

  if (!toplam) {
    const gruplar = dersler.filter((d) => d.isGrup);
    const kaynak = gruplar.length > 0 ? gruplar : dersler;
    const soru = kaynak.reduce((s, d) => s + d.soru, 0);
    const dogru = kaynak.reduce((s, d) => s + d.dogru, 0);
    const yanlis = kaynak.reduce((s, d) => s + d.yanlis, 0);
    toplam = {
      soru,
      dogru,
      yanlis,
      bos: Math.max(0, soru - dogru - yanlis),
      net: hesaplaNet(dogru, yanlis),
      basariYuzde: soru > 0 ? Math.round((hesaplaNet(dogru, yanlis) / soru) * 1000) / 10 : null,
      sinifOrt: null,
      kurumOrt: null,
      genelOrt: null,
    };
    uyarilar.push("Toplam satiri bulunamadi, ders gruplarindan hesaplandi.");
  }

  return { dersler, toplam };
}

function parseCevaplar(left: PdfLine[], uyarilar: string[]): ParsedAnswerSheet[] {
  const sonuc: ParsedAnswerSheet[] = [];

  for (let i = 0; i < left.length; i++) {
    const line = left[i];
    if (!/Cevap Anahtarı/i.test(line.text)) continue;

    const keyTokens = line.tokens.filter(isKeyToken);
    const ruler = buildRuler(keyTokens);
    if (!ruler || ruler.length < 5) {
      uyarilar.push("Cevap anahtari satiri okunamadi.");
      continue;
    }
    const cevapAnahtari = alignToRuler(keyTokens, ruler);

    const kitapcik =
      line.tokens.find((t) => /^[A-E]$/.test(t.text.trim()) && t.x < ruler.originX - 1)?.text.trim() ??
      null;

    // Bu formatta ogrenci cevaplari, anahtar satirinin bir ustunde ve basinda
    // ders grubu etiketi ile yer aliyor.
    const ogrenciSatiri = left[i - 1];
    let ogrenciCevaplari = " ".repeat(ruler.length);
    let dersGrubu = "Bilinmiyor";

    if (ogrenciSatiri) {
      const etiket = ogrenciSatiri.tokens
        .filter((t) => t.x < ruler.originX - 1)
        .map((t) => t.text)
        .join(" ")
        .trim();
      if (etiket) dersGrubu = etiket;

      const ogrenciTokenlari = ogrenciSatiri.tokens.filter(
        (t) => t.x >= ruler.originX - ruler.pitch / 2 && isStudentAnswerToken(t),
      );
      if (ogrenciTokenlari.length > 0) {
        ogrenciCevaplari = alignToRuler(ogrenciTokenlari, ruler);
      }
    }

    sonuc.push({
      dersGrubu: resolveDersGrubu(dersGrubu, dersGrubu),
      kitapcik,
      cevapAnahtari,
      ogrenciCevaplari,
    });
  }

  if (sonuc.length === 0) uyarilar.push("Cevap anahtari bulunamadi.");
  return sonuc;
}

function parseKazanimlar(right: PdfLine[]): ParsedTopic[] {
  const kazanimlar: ParsedTopic[] = [];
  let aktifGrup: string | null = null;
  let aktifDers: string | null = null;

  for (const line of right) {
    const sonDortEtiket = line.tokens.slice(-4).map((t) => t.text.trim());
    const basliktir =
      sonDortEtiket.length === 4 &&
      sonDortEtiket[0] === "S" &&
      sonDortEtiket[1] === "D" &&
      sonDortEtiket[2] === "Y" &&
      sonDortEtiket[3] === "B%";

    if (basliktir) {
      aktifDers = labelOf(line, 4) || aktifDers;
      continue;
    }

    if (isDersGrubuAdi(line.text)) {
      aktifGrup = line.text;
      continue;
    }

    const values = trailingNumbers(line, 4);
    if (!values || !aktifDers) continue;

    const [soru, dogru, yanlis, basari] = values;
    if (soru <= 0) continue;

    kazanimlar.push({
      dersAdi: aktifDers,
      dersGrubu: resolveDersGrubu(aktifDers, aktifGrup),
      kazanim: labelOf(line, 4),
      soru,
      dogru,
      yanlis,
      basariYuzde: basari,
    });
  }

  return kazanimlar;
}
