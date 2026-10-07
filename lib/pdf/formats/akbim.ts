/**
 * Akbim / AKBİM-KOÇ "SINAV SONUÇ BELGESİ" (örnek: sample_denem_3.PDF).
 *
 * Sayfa düzeni diğer iki formattan farklı: dersler yatay kolon, kimlik tek satır,
 * cevap anahtarı ile öğrenci cevabı alt alta, kazanımlar üç sütun.
 * V1'de yalnızca soru sayısı > 0 olan TYT kolonları alınır.
 */
import type { PdfLine, PdfPage, PdfToken } from "../extract";
import {
  hesaplaNet,
  normalizeGroupFlags,
  parseTrNumber,
  resolveDersGrubu,
} from "../parseUtils";
import type {
  ParsedAnswerSheet,
  ParsedRanks,
  ParsedStudentPage,
  ParsedSubject,
  ParsedTopic,
} from "../types";

const TYT_GRUPLARI = new Set(["TYT Türkçe", "TYT Sosyal", "TYT Matematik", "TYT Fen"]);

const CEVAP_ETIKETLERI: Record<string, string> = {
  TURKCE: "TYT Türkçe",
  SOSYAL: "TYT Sosyal",
  TMAT: "TYT Matematik",
  FEN: "TYT Fen",
};

export function parseAkbimPage(page: PdfPage): ParsedStudentPage {
  const uyarilar: string[] = [];
  const kimlik = parseKimlik(page.lines, uyarilar);
  const { dersler, toplam } = parseDersTablosu(page.lines, uyarilar);
  const { siralar, katilimlar } = parseDereceler(page.lines);
  const kitapcik = parseKitapcik(page.lines);
  const cevaplar = parseCevaplar(page.lines, kitapcik, dersler, uyarilar);
  const kazanimlar = parseKazanimlar(page.lines);

  return {
    pageNumber: page.pageNumber,
    format: "AKBIM",
    sinavAdi: kimlik.sinavAdi,
    kurumAdi: kimlik.kurumAdi,
    il: kimlik.il,
    ilce: kimlik.ilce,
    ogrenciAdi: kimlik.ogrenciAdi,
    ogrenciNo: kimlik.ogrenciNo,
    sinif: kimlik.sinif,
    puan: parsePuan(page.lines),
    genelOrtalamaPuan: null,
    yuzdelikDilim: null,
    toplam,
    siralar,
    katilimlar,
    dersler,
    kazanimlar,
    cevaplar,
    uyarilar,
  };
}

function parseKimlik(lines: PdfLine[], uyarilar: string[]) {
  let il: string | null = null;
  let ilce: string | null = null;
  let kurumAdi: string | null = null;

  const konum = lines.find((line) => line.text.split("/").length >= 3 && line.top < 30);
  if (konum) {
    const parcalar = konum.text.split("/").map((p) => p.trim());
    il = parcalar[0] ?? null;
    ilce = parcalar[1] ?? null;
    kurumAdi = parcalar.slice(2).join(" / ").replace(/SINAV.*/i, "").trim() || null;
  }

  const baslik = lines.find((line) => /MEB\s*KODU/i.test(line.text) && /SOYADI/i.test(line.text));
  const veri = baslik ? lines.find((line) => line.top > baslik.top && line.top < baslik.top + 20) : null;

  let ogrenciAdi = "";
  let ogrenciNo: string | null = null;
  let sinif: string | null = null;
  let sinavAdi: string | null = null;

  if (baslik && veri) {
    const xOf = (desen: RegExp) => {
      const token = baslik.tokens.find((t) => desen.test(t.text));
      return token ? (token.x + token.endX) / 2 : null;
    };
    const hedefler = [
      xOf(/MEB/i) ?? 41,
      xOf(/ŞUBE/i) ?? 72,
      xOf(/ÖĞR/i) ?? 97,
      xOf(/TC/i) ?? 135,
      xOf(/SOYADI/i) ?? 236,
      xOf(/SINAV/i) ?? 427,
      xOf(/TARİH/i) ?? 559,
    ];

    const kolon = (index: number) =>
      veri.tokens.filter((token) => {
        const merkez = (token.x + token.endX) / 2;
        return hedefler.every(
          (hedef, i) => i === index || Math.abs(merkez - hedefler[index]) <= Math.abs(merkez - hedef),
        );
      });

    const metin = (index: number) =>
      kolon(index)
        .map((t) => t.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    const sube = metin(1);
    sinif = !sube || sube === "0" ? null : sube;

    const noHam = [...kolon(2), ...kolon(3)].map((t) => t.text).join(" ");
    const noEslesme = noHam.match(/(\d{3,})(?=\*|\s|$)/);
    ogrenciNo = noEslesme?.[1] ?? null;

    ogrenciAdi = metin(4).replace(/TÜRKİYE GENELİ.*$/i, "").trim();
    sinavAdi =
      metin(5) ||
      veri.tokens.find((t) => /TYT|AYT|DENEME|PROVA|SINAV/i.test(t.text))?.text.trim() ||
      null;
    if (sinavAdi && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(sinavAdi)) sinavAdi = null;
  }

  if (!ogrenciAdi) uyarilar.push("Öğrenci adı okunamadı.");

  return { il, ilce, kurumAdi, ogrenciAdi, ogrenciNo, sinif, sinavAdi };
}

function parsePuan(lines: PdfLine[]): number | null {
  const puanBaslik = lines.find((line) => /^PUANLAR/i.test(line.text.trim()) || /PUANLAR/i.test(line.text));
  if (!puanBaslik) return null;
  const sonraki = lines.find((line) => line.top > puanBaslik.top && line.top < puanBaslik.top + 20);
  if (!sonraki) return null;
  const aday = sonraki.tokens
    .map((t) => parseTrNumber(t.text))
    .find((v) => v !== null && v > 50 && v < 600);
  return aday ?? null;
}

function parseDersTablosu(lines: PdfLine[], uyarilar: string[]) {
  const baslik = lines.find((line) => /^DERSLER\b/i.test(line.text));
  if (!baslik) {
    uyarilar.push("Ders tablosu başlığı bulunamadı.");
    return { dersler: [] as ParsedSubject[], toplam: bosToplam() };
  }

  const kolonlar = baslik.tokens
    .filter((t) => !/^DERSLER$/i.test(t.text.trim()))
    .map((t) => ({
      ad: t.text.trim(),
      x: (t.x + t.endX) / 2,
    }));

  const satir = (desen: RegExp) =>
    lines.find((line) => line.top > baslik.top && line.top < baslik.top + 100 && desen.test(line.text));

  const degerler = (line: PdfLine | undefined) => {
    const map = new Map<string, number>();
    if (!line) return map;
    for (const token of line.tokens) {
      const value = parseTrNumber(token.text);
      if (value === null) continue;
      const kolon = enYakin(token, kolonlar);
      if (kolon) map.set(kolon.ad, value);
    }
    return map;
  };

  const sorular = degerler(satir(/SORU SAYISI/i));
  const dogrular = degerler(satir(/DOĞRU CEVAP/i));
  const yanlislar = degerler(satir(/YANLIŞ CEVAP/i));
  const boslar = degerler(satir(/BOŞ CEVAP/i));
  const netler = degerler(satir(/^NET\b/i));
  const basarilar = degerler(satir(/BAŞARI ORANI/i));
  const ortalamalar = degerler(satir(/SINAV NET ORT/i));

  const dersler: ParsedSubject[] = [];
  for (const kolon of kolonlar) {
    const soru = sorular.get(kolon.ad) ?? 0;
    if (soru <= 0) continue;
    const grup = resolveDersGrubu(kolon.ad);
    if (!TYT_GRUPLARI.has(grup)) continue;

    const dogru = dogrular.get(kolon.ad) ?? 0;
    const yanlis = yanlislar.get(kolon.ad) ?? 0;
    const bos = boslar.get(kolon.ad) ?? Math.max(0, soru - dogru - yanlis);
    const net = netler.get(kolon.ad) ?? hesaplaNet(dogru, yanlis);

    dersler.push({
      dersAdi: kolon.ad,
      dersGrubu: grup,
      isGrup: true,
      soru,
      dogru,
      yanlis,
      bos,
      net,
      basariYuzde: basarilar.get(kolon.ad) ?? null,
      sinifOrt: null,
      kurumOrt: null,
      genelOrt: ortalamalar.get(kolon.ad) ?? null,
    });
  }

  normalizeGroupFlags(dersler);
  if (dersler.length === 0) uyarilar.push("TYT ders kolonları okunamadı.");

  const soru = dersler.reduce((s, d) => s + d.soru, 0);
  const dogru = dersler.reduce((s, d) => s + d.dogru, 0);
  const yanlis = dersler.reduce((s, d) => s + d.yanlis, 0);
  const bos = dersler.reduce((s, d) => s + d.bos, 0);
  const net = Math.round(dersler.reduce((s, d) => s + d.net, 0) * 100) / 100;

  return {
    dersler,
    toplam: {
      soru,
      dogru,
      yanlis,
      bos,
      net,
      basariYuzde: soru > 0 ? Math.round((net / soru) * 1000) / 10 : null,
      sinifOrt: null,
      kurumOrt: null,
      genelOrt: null,
    },
  };
}

function enYakin(token: PdfToken, kolonlar: Array<{ ad: string; x: number }>) {
  const merkez = (token.x + token.endX) / 2;
  let enIyi = kolonlar[0];
  let enIyiFark = Infinity;
  for (const kolon of kolonlar) {
    const fark = Math.abs(kolon.x - merkez);
    if (fark < enIyiFark) {
      enIyi = kolon;
      enIyiFark = fark;
    }
  }
  return enIyiFark < 18 ? enIyi : null;
}

function parseDereceler(lines: PdfLine[]): { siralar: ParsedRanks; katilimlar: ParsedRanks } {
  const siralar = bosRanks();
  const katilimlar = bosRanks();

  const oku = (desen: RegExp, alan: keyof ParsedRanks) => {
    const line = lines.find((l) => desen.test(l.text) && l.top > 170 && l.top < 240);
    if (!line) return;
    const sayilar = line.tokens
      .map((t) => parseTrNumber(t.text))
      .filter((v): v is number => v !== null && v > 0);
    if (sayilar[0] != null) siralar[alan] = sayilar[0];
    if (sayilar[1] != null) katilimlar[alan] = sayilar[1];
  };

  oku(/^TÜRKİYE\b/i, "genel");
  oku(/^İL\b/i, "il");
  oku(/^İLÇE\b/i, "ilce");
  oku(/\bKURUM\b/i, "kurum");
  oku(/^ŞUBE\b/i, "sinif");

  return { siralar, katilimlar };
}

function parseKitapcik(lines: PdfLine[]): string | null {
  const baslik = lines.find((line) => /Kitapçık/i.test(line.text));
  if (!baslik) return null;
  const yakin = lines.filter((line) => line.top > baslik.top && line.top < baslik.top + 50);
  for (const line of yakin) {
    const token = line.tokens.find((t) => /^[A-E]$/.test(t.text.trim()) && t.x > 430);
    if (token) return token.text.trim();
  }
  return null;
}

function parseCevaplar(
  lines: PdfLine[],
  kitapcik: string | null,
  dersler: ParsedSubject[],
  uyarilar: string[],
): ParsedAnswerSheet[] {
  const sonuc: ParsedAnswerSheet[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/ÖĞRENCİ CEVABI/i.test(line.text)) continue;
    const anahtarSatiri = lines[i - 1];
    if (!anahtarSatiri) continue;

    const bloklar = cevapBloklari(anahtarSatiri);
    if (bloklar.length === 0) continue;

    for (const blok of bloklar) {
      const anahtarHarfler = patlatCevapTokenlari(
        anahtarSatiri.tokens.filter((t) => t.x >= blok.minX && t.x < blok.maxX),
      );
      if (anahtarHarfler.length < 5) continue;

      const ogrenciHarfler = patlatCevapTokenlari(
        line.tokens.filter((t) => t.x >= blok.minX - 4 && t.x < blok.maxX + 4),
      );
      const beklenen = dersler.find((d) => d.dersGrubu === blok.grup)?.soru;
      const kirpilmis =
        beklenen && anahtarHarfler.length > beklenen
          ? anahtarHarfler.slice(0, beklenen)
          : anahtarHarfler;
      const cevapAnahtari = kirpilmis.map((h) => h.char).join("");
      const ogrenciCevaplari = hizalaCevaplar(kirpilmis, ogrenciHarfler);

      sonuc.push({
        dersGrubu: blok.grup,
        kitapcik,
        cevapAnahtari,
        ogrenciCevaplari,
      });
    }
  }

  if (sonuc.length === 0) uyarilar.push("Cevap anahtarı bulunamadı.");
  return sonuc;
}

function cevapBloklari(line: PdfLine) {
  const etiketler: Array<{ grup: string; x: number; endX: number }> = [];
  for (const token of line.tokens) {
    const grup = cevapGrubu(token.text);
    if (grup) etiketler.push({ grup, x: token.x, endX: token.endX });
  }
  etiketler.sort((a, b) => a.x - b.x);

  return etiketler.map((etiket, index) => ({
    grup: etiket.grup,
    minX: etiket.endX - 2,
    maxX: etiketler[index + 1] ? etiketler[index + 1].x - 2 : 2000,
  }));
}

function cevapGrubu(raw: string): string | null {
  const key = raw.replace(/[\s.]+/g, "").toLocaleUpperCase("tr");
  if (key === "TURKCE" || key === "TÜRKÇE") return CEVAP_ETIKETLERI.TURKCE;
  if (key === "SOSYAL") return CEVAP_ETIKETLERI.SOSYAL;
  if (key === "TMAT") return CEVAP_ETIKETLERI.TMAT;
  if (key === "FEN") return CEVAP_ETIKETLERI.FEN;
  return null;
}

function patlatCevapTokenlari(tokens: PdfToken[]): Array<{ char: string; x: number }> {
  const harfler: Array<{ char: string; x: number }> = [];
  for (const token of tokens) {
    const chars = [...token.text].filter((c) => /[A-Ea-eT]/i.test(c));
    if (chars.length === 0) continue;
    const genislik = Math.max(token.endX - token.x, 4);
    const adim = genislik / chars.length;
    chars.forEach((char, index) => {
      harfler.push({ char: char.toUpperCase() === char ? char : char, x: token.x + adim * (index + 0.5) });
    });
  }
  return harfler.sort((a, b) => a.x - b.x);
}

function hizalaCevaplar(
  anahtar: Array<{ char: string; x: number }>,
  ogrenci: Array<{ char: string; x: number }>,
): string {
  const slotlar = new Array<string>(anahtar.length).fill(" ");
  const kullanildi = new Set<number>();
  for (const verilen of ogrenci) {
    let enIyi = -1;
    let enIyiFark = Infinity;
    for (let i = 0; i < anahtar.length; i++) {
      if (kullanildi.has(i)) continue;
      const fark = Math.abs(anahtar[i].x - verilen.x);
      if (fark < enIyiFark) {
        enIyiFark = fark;
        enIyi = i;
      }
    }
    if (enIyi < 0) continue;
    const adim =
      anahtar.length > 1
        ? Math.abs(anahtar[Math.min(enIyi + 1, anahtar.length - 1)].x - anahtar[Math.max(enIyi - 1, 0)].x) || 8
        : 12;
    if (enIyiFark > adim * 1.15) continue;
    kullanildi.add(enIyi);
    const dogru = anahtar[enIyi].char.toUpperCase();
    const isaret = verilen.char.toUpperCase();
    // Akbim anahtarında T = iptal soru; tablo her işareti doğru sayar.
    slotlar[enIyi] = dogru === "T" || isaret === dogru ? isaret : isaret.toLocaleLowerCase("tr");
  }
  return slotlar.join("");
}

function parseKazanimlar(lines: PdfLine[]): ParsedTopic[] {
  const baslik = lines.find((line) => (line.text.match(/KONU ADI/gi) ?? []).length >= 2);
  if (!baslik) return [];

  const sutunlar = [
    { min: 0, max: 205 },
    { min: 205, max: 400 },
    { min: 400, max: 2000 },
  ];
  const aktifDers = ["", "", ""];
  const kazanimlar: ParsedTopic[] = [];

  for (const line of lines) {
    if (line.top <= baslik.top) continue;
    if (/AKBİM|AKBIM|KOÇ/i.test(line.text) && line.top > 800) continue;

    for (let s = 0; s < sutunlar.length; s++) {
      const tokens = line.tokens.filter(
        (t) => (t.x + t.endX) / 2 >= sutunlar[s].min && (t.x + t.endX) / 2 < sutunlar[s].max,
      );
      if (tokens.length === 0) continue;

      const { etiket, sayilar } = etiketVeSayilar(tokens);
      if (!etiket) continue;

      if (sayilar.length < 3) {
        if (kazanimBasligiMi(etiket)) aktifDers[s] = etiket;
        continue;
      }

      if (kazanimBasligiMi(etiket) && sayilar.every((n) => n === 0)) {
        aktifDers[s] = etiket;
        continue;
      }

      if (kazanimBasligiMi(etiket)) aktifDers[s] = etiket;
      if (kazanimBasligiMi(etiket)) continue;
      const dersAdi = aktifDers[s];
      if (!dersAdi) continue;

      const [soru, dogru, yanlis, basari] = [
        sayilar[0],
        sayilar[1],
        sayilar[2],
        sayilar[3] ?? null,
      ];
      if (soru <= 0) continue;

      kazanimlar.push({
        dersAdi,
        dersGrubu: resolveDersGrubu(dersAdi),
        kazanim: etiket,
        soru,
        dogru,
        yanlis,
        basariYuzde: basari,
      });
    }
  }

  return kazanimlar;
}

function etiketVeSayilar(tokens: PdfToken[]) {
  const sayilar: number[] = [];
  const parcalar: string[] = [];

  for (const token of tokens) {
    const direkt = parseTrNumber(token.text);
    if (direkt !== null && /^[%\d.,\s-]+$/.test(token.text.trim())) {
      sayilar.push(direkt);
      continue;
    }

    const birlesik = token.text.match(/^(.*\D)\s*(\d{1,2})$/);
    if (birlesik && birlesik[1].trim().length > 8) {
      parcalar.push(birlesik[1].trim());
      sayilar.push(Number(birlesik[2]));
      continue;
    }

    parcalar.push(token.text);
  }

  return {
    etiket: parcalar.join(" ").replace(/\s+/g, " ").trim(),
    sayilar,
  };
}

function kazanimBasligiMi(raw: string): boolean {
  const key = raw.replace(/\s+/g, "").toLocaleUpperCase("tr");
  return /^(TÜRKÇE|TURKCE|SOSYAL|T\.?MAT|GEO-?1|TAR-?1|COĞ-?1|COG-?1|FEL-?1|DİN-?1|DIN-?1|FİZ-?1|FIZ-?1|KİM-?1|KIM-?1|BİY-?1|BIY-?1)$/.test(
    key,
  );
}

function bosRanks(): ParsedRanks {
  return { sinif: null, kurum: null, ilce: null, il: null, genel: null };
}

function bosToplam(): ParsedStudentPage["toplam"] {
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
