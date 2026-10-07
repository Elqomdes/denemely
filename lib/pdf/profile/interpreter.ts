import { SINAV_GRUP_SET } from "@/lib/sinav";
import type { PdfLine, PdfPage, PdfToken } from "../extract";
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
  ParsedRanks,
  ParsedStudentPage,
  ParsedSubject,
  ParsedTopic,
  ParsedTotals,
} from "../types";
import {
  bantSatirlari,
  enYakinKolon,
  isimGibi,
  satirEslese,
  satirSayilari,
  tokenMerkez,
  topAraliginda,
  yildizdanNumara,
} from "./helpers";
import type { FormatProfile } from "./schema";

export function parseProfilSayfasi(page: PdfPage, profil: FormatProfile): ParsedStudentPage {
  const uyarilar: string[] = [];
  const kimlikSatirlari = bantSatirlari(page, profil.sayfa.kimlikBandi)[0] ?? page.lines;
  const kimlik = parseKimlik(page, kimlikSatirlari, profil, uyarilar);

  let dersler: ParsedSubject[] = [];
  let toplam: ParsedTotals | null = null;
  for (const bant of bantSatirlari(page, profil.sayfa.dersBandi)) {
    const okunan = parseDersler(bant, profil, uyarilar);
    dersler.push(...okunan.dersler);
    if (okunan.toplam) toplam = okunan.toplam;
  }
  dersler = sinavDersleri(dersler);
  normalizeGroupFlags(dersler);
  if (dersler.length === 0) uyarilar.push("Ders satırları okunamadı.");
  if (!toplam) toplam = gruplardanToplam(dersler);

  const { siralar, katilimlar } = parseSiralar(page, profil);

  const cevaplar: ParsedAnswerSheet[] = [];
  const cevapBantlari =
    profil.cevap.yontem === "etiket_cift" ? [page.lines] : bantSatirlari(page, profil.sayfa.cevapBandi);
  for (const bant of cevapBantlari) {
    cevaplar.push(...parseCevaplar(bant, dersler, profil, uyarilar));
  }

  const kazanimlar: ParsedTopic[] = [];
  for (const bant of bantSatirlari(page, profil.sayfa.kazanimBandi)) {
    kazanimlar.push(...parseKazanimlar(page, bant, profil));
  }

  return {
    pageNumber: page.pageNumber,
    format: "PROFIL",
    sinavAdi: kimlik.sinavAdi,
    kurumAdi: kimlik.kurumAdi,
    il: kimlik.il,
    ilce: kimlik.ilce,
    ogrenciAdi: kimlik.ogrenciAdi,
    ogrenciNo: kimlik.ogrenciNo,
    sinif: kimlik.sinif,
    puan: kimlik.puan,
    genelOrtalamaPuan: kimlik.genelOrtalamaPuan,
    yuzdelikDilim: kimlik.yuzdelikDilim,
    toplam,
    siralar,
    katilimlar,
    dersler,
    kazanimlar,
    cevaplar,
    uyarilar,
  };
}

function parseKimlik(page: PdfPage, lines: PdfLine[], profil: FormatProfile, uyarilar: string[]) {
  let il: string | null = null;
  let ilce: string | null = null;
  let kurumAdi: string | null = null;
  let ogrenciAdi = "";
  let ogrenciNo: string | null = null;
  let sinif: string | null = null;
  let sinavAdi: string | null = null;

  if (profil.kimlik.konumDeseni) {
    const konum = lines.find(
      (line) =>
        topAraliginda(line, profil.kimlik.konumMinTop, profil.kimlik.konumMaxTop) &&
        satirEslese(line, profil.kimlik.konumDeseni) &&
        line.text.split("/").length >= 2,
    );
    if (konum) {
      const parcalar = konum.text.split("/").map((p) => p.trim());
      il = parcalar[0] || null;
      ilce = parcalar[1] || null;
      kurumAdi = parcalar.slice(2).join(" / ").replace(/SINAV.*/i, "").trim() || null;
    }
  }

  if (profil.kimlik.baslikDeseni) {
    const baslik = lines.find((line) => satirEslese(line, profil.kimlik.baslikDeseni));
    const veri = baslik ? lines.find((line) => line.top > baslik.top && line.top < baslik.top + 22) : null;
    if (baslik && veri) {
      const ata = (baslikDeseni: string) => {
        if (!baslikDeseni) return "";
        const hedef = baslik.tokens.find((t) => satirEslese({ ...baslik, text: t.text, tokens: [t] }, baslikDeseni));
        if (!hedef) return "";
        const merkez = tokenMerkez(hedef);
        return veri.tokens
          .filter((token) => {
            const uzaklik = Math.abs(tokenMerkez(token) - merkez);
            return baslik.tokens.every((diger) => {
              if (diger === hedef) return true;
              return uzaklik <= Math.abs(tokenMerkez(token) - tokenMerkez(diger));
            });
          })
          .map((t) => t.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      };

      const ad = ata(profil.kimlik.adBaslik);
      const no = ata(profil.kimlik.noBaslik);
      const sinifHam = ata(profil.kimlik.sinifBaslik);
      const sinav = ata(profil.kimlik.sinavBaslik);

      if (ad) ogrenciAdi = profil.kimlik.adSinavBasliginiAt ? ad.replace(/TÜRKİYE GENELİ.*$/i, "").trim() : ad;
      if (sinifHam && sinifHam !== "0") sinif = sinifHam;
      if (sinav && !/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(sinav)) sinavAdi = sinav;

      if (no) {
        ogrenciNo = profil.kimlik.noYildizdanAyir ? yildizdanNumara(no) : no.replace(/\s+/g, " ").trim();
        if (ogrenciNo === "0") ogrenciNo = null;
      }
    }
  }

  if (!ogrenciAdi && profil.kimlik.alternatifAdDeseni) {
    const sinifIndex = lines.findIndex((line) => satirEslese(line, profil.kimlik.alternatifAdDeseni));
    if (sinifIndex >= 0) {
      const tokens = lines[sinifIndex].tokens;
      const tireIndex = tokens.findIndex((t) => t.text.trim() === "-");
      if (tireIndex >= 0) {
        sinif =
          tokens
            .slice(0, tireIndex)
            .map((t) => t.text)
            .join(" ")
            .trim() || sinif;
        const noHam = tokens
          .slice(tireIndex + 1)
          .map((t) => t.text)
          .join(" ")
          .trim();
        ogrenciNo = noHam && noHam !== "0" ? noHam : ogrenciNo;
      } else {
        sinif = lines[sinifIndex].text.trim() || sinif;
      }
      const adSatiri = lines[sinifIndex + 1];
      if (adSatiri) {
        const parcalar: string[] = [];
        for (const token of adSatiri.tokens) {
          if (parseTrNumber(token.text) !== null) break;
          parcalar.push(token.text);
        }
        ogrenciAdi = parcalar.join(" ").replace(/\s+/g, " ").trim();
      }
    }
  }

  if (ogrenciAdi && !isimGibi(ogrenciAdi)) {
    uyarilar.push("Öğrenci adı sınav başlığına benziyor, atlandı.");
    ogrenciAdi = "";
  }
  if (!ogrenciAdi) uyarilar.push("Öğrenci adı okunamadı.");

  const puan = parsePuan(page.lines, profil);
  const yuzdelikDilim = parseYuzdelik(page.lines, profil);

  return {
    il,
    ilce,
    kurumAdi,
    ogrenciAdi,
    ogrenciNo,
    sinif,
    sinavAdi,
    puan,
    genelOrtalamaPuan: null as number | null,
    yuzdelikDilim,
  };
}

function parsePuan(lines: PdfLine[], profil: FormatProfile): number | null {
  if (profil.kimlik.puanYontem === "yok") return null;
  const min = profil.kimlik.puanMin > 0 ? profil.kimlik.puanMin : 50;
  const max = profil.kimlik.puanMax > 0 ? profil.kimlik.puanMax : 600;

  const etiketten = () => {
    if (!profil.kimlik.puanEtiket) return null;
    const baslik = lines.find((line) => satirEslese(line, profil.kimlik.puanEtiket));
    if (!baslik) return null;
    const adaylar = lines.filter((line) => line.top >= baslik.top - 4 && line.top <= baslik.top + 28);
    for (const line of adaylar) {
      for (const token of line.tokens) {
        const value = parseTrNumber(token.text);
        if (value !== null && value >= min && value <= max) return value;
      }
    }
    return null;
  };

  if (profil.kimlik.puanYontem === "tek_ondalik") {
    for (const line of lines) {
      for (const token of line.tokens) {
        if (!/^\d{1,3}[.,]\d{2,3}$/.test(token.text.trim())) continue;
        const value = parseTrNumber(token.text);
        if (value !== null && value >= min && value <= max) return value;
      }
    }
    return etiketten();
  }

  if (profil.kimlik.puanYontem === "etiket_yakin") return etiketten();
  return null;
}

function parseYuzdelik(lines: PdfLine[], profil: FormatProfile): number | null {
  if (!profil.kimlik.yuzdelikDeseni) return null;
  const line = lines.find((l) => satirEslese(l, profil.kimlik.yuzdelikDeseni));
  if (!line) return null;
  const yuzde = line.tokens.find((t) => t.text.includes("%"));
  return yuzde ? parseTrNumber(yuzde.text) : satirSayilari(line).find((v) => v > 0 && v <= 100) ?? null;
}

function parseDersler(lines: PdfLine[], profil: FormatProfile, uyarilar: string[]) {
  if (profil.ders.yontem === "yatay_kolon") return parseYatayDers(lines, profil, uyarilar);
  if (profil.ders.yontem === "dikey_yuzde") return parseDikeyYuzde(lines, profil);
  return parseDikeyKuyruk(lines, profil);
}

function parseYatayDers(lines: PdfLine[], profil: FormatProfile, uyarilar: string[]) {
  const baslik = lines.find((line) => (profil.ders.baslikDeseni ? satirEslese(line, profil.ders.baslikDeseni) : false));
  if (!baslik) {
    uyarilar.push("Ders tablosu başlığı bulunamadı.");
    return { dersler: [] as ParsedSubject[], toplam: null as ParsedTotals | null };
  }

  const kolonlar = baslik.tokens
    .filter((t) => !satirEslese({ ...baslik, text: t.text, tokens: [t] }, profil.ders.baslikDeseni || "^DERS"))
    .map((t) => ({ ad: t.text.trim(), x: tokenMerkez(t) }))
    .filter((k) => k.ad.length > 0);

  const satir = (desen: string) =>
    desen
      ? lines.find((line) => line.top > baslik.top && line.top < baslik.top + 110 && satirEslese(line, desen))
      : undefined;

  const degerler = (line: PdfLine | undefined) => {
    const map = new Map<string, number>();
    if (!line) return map;
    for (const token of line.tokens) {
      const value = parseTrNumber(token.text);
      if (value === null) continue;
      const kolon = enYakinKolon(token, kolonlar);
      if (kolon) map.set(kolon.ad, value);
    }
    return map;
  };

  const sorular = degerler(satir(profil.ders.soruSatir));
  const dogrular = degerler(satir(profil.ders.dogruSatir));
  const yanlislar = degerler(satir(profil.ders.yanlisSatir));
  const boslar = degerler(satir(profil.ders.bosSatir));
  const netler = degerler(satir(profil.ders.netSatir));
  const basarilar = degerler(satir(profil.ders.basariSatir));
  const ortalamalar = degerler(satir(profil.ders.ortSatir));

  const dersler: ParsedSubject[] = [];
  for (const kolon of kolonlar) {
    const soru = sorular.get(kolon.ad) ?? 0;
    if (soru <= 0) continue;
    const grup = resolveDersGrubu(kolon.ad);
    if (!SINAV_GRUP_SET.has(grup)) continue;
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

  return { dersler, toplam: null as ParsedTotals | null };
}

function parseDikeyKuyruk(lines: PdfLine[], profil: FormatProfile) {
  const adet = Math.max(3, Math.round(profil.ders.kuyrukSayi) || 6);
  const dersler: ParsedSubject[] = [];
  let toplam: ParsedTotals | null = null;

  for (const line of lines) {
    const values = trailingNumbers(line, adet);
    if (!values) continue;
    const label = labelOf(line, adet);
    if (!label) continue;
    const al = (idx: number) => (idx >= 0 && idx < values.length ? values[idx] : null);
    const soru = al(profil.ders.idxSoru) ?? 0;
    const dogru = al(profil.ders.idxDogru) ?? 0;
    const yanlis = al(profil.ders.idxYanlis) ?? 0;
    const bos = al(profil.ders.idxBos) ?? Math.max(0, soru - dogru - yanlis);
    const net = al(profil.ders.idxNet) ?? hesaplaNet(dogru, yanlis);

    if (profil.ders.toplamEtiket && satirEslese({ ...line, text: label, tokens: line.tokens }, profil.ders.toplamEtiket)) {
      toplam = {
        soru,
        dogru,
        yanlis,
        bos,
        net,
        basariYuzde: al(profil.ders.idxBasari),
        sinifOrt: al(profil.ders.idxSinifOrt),
        kurumOrt: al(profil.ders.idxKurumOrt),
        genelOrt: al(profil.ders.idxGenelOrt),
      };
      continue;
    }

    const grup = resolveDersGrubu(label);
    if (soru <= 0) continue;
    if (!SINAV_GRUP_SET.has(grup) && !isDersGrubuAdi(label) && grup === "Diğer") continue;

    dersler.push({
      dersAdi: label,
      dersGrubu: grup,
      isGrup: isDersGrubuAdi(label),
      soru,
      dogru,
      yanlis,
      bos,
      net,
      basariYuzde: al(profil.ders.idxBasari),
      sinifOrt: al(profil.ders.idxSinifOrt),
      kurumOrt: al(profil.ders.idxKurumOrt),
      genelOrt: al(profil.ders.idxGenelOrt),
    });
  }

  return { dersler, toplam };
}

function parseDikeyYuzde(lines: PdfLine[], profil: FormatProfile) {
  const dersler: ParsedSubject[] = [];
  for (const line of lines) {
    const yuzdeIndex = line.tokens.findIndex((t) => t.text.includes("%"));
    if (yuzdeIndex < 5) continue;
    const sayilar: number[] = [];
    let bozuk = false;
    for (let i = yuzdeIndex - 5; i < yuzdeIndex; i++) {
      const value = parseTrNumber(line.tokens[i].text);
      if (value === null) {
        bozuk = true;
        break;
      }
      sayilar.push(value);
    }
    if (bozuk) continue;
    const etiketTokenlari = line.tokens.slice(0, yuzdeIndex - 5);
    if (etiketTokenlari.length === 0) continue;
    if (parseTrNumber(etiketTokenlari[etiketTokenlari.length - 1].text) !== null) continue;
    const dersAdi = etiketTokenlari
      .map((t) => t.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const [soru, dogru, yanlis, bos, net] = sayilar;
    const grup = resolveDersGrubu(dersAdi);
    if (!SINAV_GRUP_SET.has(grup) && !isDersGrubuAdi(dersAdi) && grup === "Diğer") continue;
    dersler.push({
      dersAdi,
      dersGrubu: grup,
      isGrup: isDersGrubuAdi(dersAdi),
      soru,
      dogru,
      yanlis,
      bos,
      net,
      basariYuzde: parseTrNumber(line.tokens[yuzdeIndex].text),
      sinifOrt: null,
      kurumOrt: null,
      genelOrt: null,
    });
  }
  void profil;
  return { dersler, toplam: null as ParsedTotals | null };
}

function parseSiralar(page: PdfPage, profil: FormatProfile): { siralar: ParsedRanks; katilimlar: ParsedRanks } {
  const siralar = bosRanks();
  const katilimlar = bosRanks();
  if (profil.sira.yontem === "yok") return { siralar, katilimlar };

  const lines = page.lines.filter((line) => topAraliginda(line, profil.sira.minTop, profil.sira.maxTop));

  if (profil.sira.yontem === "etiketli_satir") {
    const oku = (desen: string, alan: keyof ParsedRanks) => {
      if (!desen) return;
      const line = lines.find((l) => satirEslese(l, desen));
      if (!line) return;
      const sayilar = satirSayilari(line).filter((v) => v > 0);
      const sira = sayilar[profil.sira.siraIndex] ?? sayilar[0];
      const katilim =
        profil.sira.katilimIndex >= 0 ? (sayilar[profil.sira.katilimIndex] ?? sayilar[1]) : undefined;
      if (sira != null) siralar[alan] = sira;
      if (katilim != null) katilimlar[alan] = katilim;
    };
    oku(profil.sira.genelDesen, "genel");
    oku(profil.sira.ilDesen, "il");
    oku(profil.sira.ilceDesen, "ilce");
    oku(profil.sira.kurumDesen, "kurum");
    oku(profil.sira.sinifDesen, "sinif");
  }

  if (profil.sira.yontem === "puan_kuyruk") {
    const katilim = profil.sira.katilimBaslik
      ? lines.find((l) => satirEslese(l, profil.sira.katilimBaslik))
      : undefined;
    if (katilim) {
      const degerler = satirSayilari(katilim);
      Object.assign(katilimlar, kuyrukRanks(degerler));
      const onceki = lines
        .filter((l) => l.top < katilim.top)
        .sort((a, b) => b.top - a.top)[0];
      if (onceki) {
        const puanlar = satirSayilari(onceki);
        Object.assign(siralar, kuyrukRanks(puanlar.slice(2)));
      }
    }
  }

  return { siralar, katilimlar };
}

function kuyrukRanks(values: number[]): ParsedRanks {
  return {
    sinif: values[0] ?? null,
    kurum: values[1] ?? null,
    ilce: values[2] ?? null,
    il: values[3] ?? null,
    genel: values[4] ?? null,
  };
}

function parseCevaplar(
  lines: PdfLine[],
  dersler: ParsedSubject[],
  profil: FormatProfile,
  uyarilar: string[],
): ParsedAnswerSheet[] {
  if (profil.cevap.yontem === "yok") return [];
  if (profil.cevap.yontem === "etiket_cift") return parseEtiketCift(lines, dersler, profil, uyarilar);
  return parseAnahtarSatiri(lines, profil, uyarilar);
}

function parseEtiketCift(
  lines: PdfLine[],
  dersler: ParsedSubject[],
  profil: FormatProfile,
  uyarilar: string[],
): ParsedAnswerSheet[] {
  const sonuc: ParsedAnswerSheet[] = [];
  const ogrenciDeseni = profil.cevap.ogrenciDeseni || "ÖĞRENCİ CEVABI";

  for (let i = 0; i < lines.length; i++) {
    if (!satirEslese(lines[i], ogrenciDeseni)) continue;
    const anahtarSatiri = profil.cevap.ogrenciKonum === "ust" ? lines[i + 1] : lines[i - 1];
    if (!anahtarSatiri) continue;

    const bloklar = cevapBloklari(anahtarSatiri);
    for (const blok of bloklar) {
      const anahtarHarfler = patlatCevap(anahtarSatiri.tokens.filter((t) => t.x >= blok.minX && t.x < blok.maxX));
      if (anahtarHarfler.length < 5) continue;
      const ogrenciHarfler = patlatCevap(
        lines[i].tokens.filter((t) => t.x >= blok.minX - 4 && t.x < blok.maxX + 4),
      );
      const beklenen = dersler.find((d) => d.dersGrubu === blok.grup)?.soru;
      const kirpilmis =
        beklenen && anahtarHarfler.length > beklenen ? anahtarHarfler.slice(0, beklenen) : anahtarHarfler;
      sonuc.push({
        dersGrubu: blok.grup,
        kitapcik: parseKitapcik(lines),
        cevapAnahtari: kirpilmis.map((h) => h.char).join(""),
        ogrenciCevaplari: hizalaCevaplar(kirpilmis, ogrenciHarfler, profil.cevap.iptalHarfi || "T"),
      });
    }
  }

  if (sonuc.length === 0) uyarilar.push("Cevap anahtarı bulunamadı.");
  return sonuc;
}

function parseAnahtarSatiri(lines: PdfLine[], profil: FormatProfile, uyarilar: string[]): ParsedAnswerSheet[] {
  const sonuc: ParsedAnswerSheet[] = [];
  const anahtarDeseni = profil.cevap.anahtarDeseni || "Cevap Anahtarı";
  let sonGrup: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isDersGrubuAdi(line.text)) sonGrup = resolveDersGrubu(line.text);
    if (!satirEslese(line, anahtarDeseni) && !line.tokens.some(isKeyToken)) continue;
    if (!satirEslese(line, anahtarDeseni) && !/Cevap Anahtar/i.test(line.text)) continue;

    const keyTokens = line.tokens.filter(isKeyToken);
    const ruler = buildRuler(keyTokens);
    if (!ruler || ruler.length < 5) continue;
    const cevapAnahtari = alignToRuler(keyTokens, ruler);
    const kitapcik =
      line.tokens.find((t) => /^[A-E]$/.test(t.text.trim()) && t.x < ruler.originX - 1)?.text.trim() ?? null;

    const adayIndex = profil.cevap.ogrenciKonum === "ust" ? i - 1 : i + 1;
    const adaylar =
      profil.cevap.ogrenciKonum === "ust" ? [lines[i - 1], lines[i - 2]] : [lines[i + 1], lines[i + 2]];

    let ogrenciCevaplari = " ".repeat(ruler.length);
    let dersGrubu = sonGrup ?? "Bilinmiyor";

    for (const aday of adaylar) {
      if (!aday) continue;
      if (profil.cevap.ogrenciDeseni && !satirEslese(aday, profil.cevap.ogrenciDeseni) && profil.cevap.dersKaynak !== "satir_basi") {
        if (profil.cevap.ogrenciDeseni) continue;
      }
      const etiket = aday.tokens
        .filter((t) => t.x < ruler.originX - 1)
        .map((t) => t.text)
        .join(" ")
        .trim();
      if (profil.cevap.dersKaynak === "satir_basi" && etiket) dersGrubu = etiket;
      const ogrenciTokenlari = aday.tokens.filter(
        (t) => t.x >= ruler.originX - ruler.pitch / 2 && isStudentAnswerToken(t),
      );
      if (ogrenciTokenlari.length > 0) {
        ogrenciCevaplari = encodeRuler(alignToRuler(ogrenciTokenlari, ruler), cevapAnahtari, profil.cevap.iptalHarfi);
        break;
      }
    }

    void adayIndex;
    sonuc.push({
      dersGrubu: resolveDersGrubu(dersGrubu, dersGrubu),
      kitapcik,
      cevapAnahtari,
      ogrenciCevaplari,
    });
  }

  if (sonuc.length === 0) uyarilar.push("Cevap anahtarı bulunamadı.");
  return sonuc;
}

function parseKitapcik(lines: PdfLine[]): string | null {
  const baslik = lines.find((line) => /Kitapçık|Kitapcik/i.test(line.text));
  if (!baslik) return null;
  for (const line of lines.filter((l) => l.top >= baslik.top && l.top < baslik.top + 50)) {
    const token = line.tokens.find((t) => /^[A-E]$/.test(t.text.trim()) && t.x > 400);
    if (token) return token.text.trim();
  }
  return null;
}

function cevapBloklari(line: PdfLine) {
  const etiketler: Array<{ grup: string; endX: number; x: number }> = [];
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
  if (key === "TURKCE" || key === "TÜRKÇE") return "TYT Türkçe";
  if (key === "SOSYAL") return "TYT Sosyal";
  if (key === "TMAT") return "TYT Matematik";
  if (key === "FEN") return "TYT Fen";
  if (key === "EDEBIYAT" || key === "TDE") return "AYT Edebiyat";
  if (key === "AMAT" || key === "AYTMAT") return "AYT Matematik";
  if (key === "AYTFEN") return "AYT Fen";
  if (key === "AYTSOSYAL") return "AYT Sosyal";
  return resolveDersGrubu(raw) === "Diğer" ? null : resolveDersGrubu(raw);
}

function patlatCevap(tokens: PdfToken[]): Array<{ char: string; x: number }> {
  const harfler: Array<{ char: string; x: number }> = [];
  for (const token of tokens) {
    const chars = [...token.text].filter((c) => /[A-Ea-eT]/i.test(c));
    if (chars.length === 0) continue;
    const genislik = Math.max(token.endX - token.x, 4);
    const adim = genislik / chars.length;
    chars.forEach((char, index) => {
      harfler.push({ char, x: token.x + adim * (index + 0.5) });
    });
  }
  return harfler.sort((a, b) => a.x - b.x);
}

function hizalaCevaplar(
  anahtar: Array<{ char: string; x: number }>,
  ogrenci: Array<{ char: string; x: number }>,
  iptal: string,
): string {
  const slotlar = new Array<string>(anahtar.length).fill(" ");
  const kullanildi = new Set<number>();
  const iptalHarf = (iptal || "T").toUpperCase();
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
    slotlar[enIyi] = dogru === iptalHarf || isaret === dogru ? isaret : isaret.toLocaleLowerCase("tr");
  }
  return slotlar.join("");
}

function encodeRuler(ogrenci: string, anahtar: string, iptal: string): string {
  const iptalHarf = (iptal || "T").toUpperCase();
  return [...ogrenci]
    .map((ch, i) => {
      if (ch === " ") return " ";
      const dogru = (anahtar[i] ?? "").toUpperCase();
      const isaret = ch.toUpperCase();
      return dogru === iptalHarf || isaret === dogru ? isaret : isaret.toLocaleLowerCase("tr");
    })
    .join("");
}

function parseKazanimlar(page: PdfPage, lines: PdfLine[], profil: FormatProfile): ParsedTopic[] {
  if (profil.kazanim.yontem === "yok") return [];
  if (profil.kazanim.yontem === "cok_sutun") return parseCokSutunKazanim(page, lines, profil);
  return parseArdisikKazanim(lines, profil);
}

function parseCokSutunKazanim(page: PdfPage, lines: PdfLine[], profil: FormatProfile): ParsedTopic[] {
  const sutunSayisi = Math.min(4, Math.max(1, Math.round(profil.kazanim.sutunSayisi) || 3));
  const genislik = page.width || 600;
  const sutunlar = Array.from({ length: sutunSayisi }, (_, i) => ({
    min: (genislik / sutunSayisi) * i,
    max: i === sutunSayisi - 1 ? genislik + 200 : (genislik / sutunSayisi) * (i + 1),
  }));
  const baslik = profil.kazanim.baslikDeseni
    ? lines.find((line) => satirEslese(line, profil.kazanim.baslikDeseni))
    : lines.find((line) => (line.text.match(/KONU ADI/gi) ?? []).length >= 2);

  const aktifDers = Array.from({ length: sutunSayisi }, () => "");
  const kazanimlar: ParsedTopic[] = [];

  for (const line of lines) {
    if (baslik && line.top <= baslik.top) continue;
    for (let s = 0; s < sutunlar.length; s++) {
      const tokens = line.tokens.filter((t) => {
        const m = tokenMerkez(t);
        return m >= sutunlar[s].min && m < sutunlar[s].max;
      });
      if (tokens.length === 0) continue;
      const { etiket, sayilar } = etiketVeSayilar(tokens);
      if (!etiket) continue;
      if (sayilar.length < Math.max(3, profil.kazanim.sayiAdedi - 1)) {
        if (kazanimBasligiMi(etiket)) aktifDers[s] = etiket;
        continue;
      }
      if (profil.kazanim.sifirSatirDers && kazanimBasligiMi(etiket) && sayilar.every((n) => n === 0)) {
        aktifDers[s] = etiket;
        continue;
      }
      if (kazanimBasligiMi(etiket)) {
        aktifDers[s] = etiket;
        continue;
      }
      const dersAdi = aktifDers[s];
      if (!dersAdi) continue;
      const soru = sayilar[0] ?? 0;
      if (soru <= 0) continue;
      kazanimlar.push({
        dersAdi,
        dersGrubu: resolveDersGrubu(dersAdi),
        kazanim: etiket,
        soru,
        dogru: sayilar[1] ?? 0,
        yanlis: sayilar[2] ?? 0,
        basariYuzde: sayilar[3] ?? null,
      });
    }
  }
  return kazanimlar;
}

function parseArdisikKazanim(lines: PdfLine[], profil: FormatProfile): ParsedTopic[] {
  const kazanimlar: ParsedTopic[] = [];
  let aktifDers: string | null = null;
  const adet = Math.max(3, Math.round(profil.kazanim.sayiAdedi) || 4);

  for (const line of lines) {
    if (profil.kazanim.sdybBaslik) {
      const son = line.tokens.slice(-4).map((t) => t.text.trim());
      if (son.length === 4 && son[0] === "S" && son[1] === "D" && son[2] === "Y") {
        aktifDers = labelOf(line, 4) || aktifDers;
        continue;
      }
    }
    if (isDersGrubuAdi(line.text)) continue;

    const values = trailingNumbers(line, adet);
    if (!values) continue;
    const etiket = labelOf(line, adet);
    const [soru, dogru, yanlis, basari] = values;
    if (profil.kazanim.sifirSatirDers && soru === 0 && dogru === 0 && yanlis === 0) {
      aktifDers = etiket || aktifDers;
      continue;
    }
    if (!aktifDers || soru <= 0) continue;
    kazanimlar.push({
      dersAdi: aktifDers,
      dersGrubu: resolveDersGrubu(aktifDers),
      kazanim: etiket,
      soru,
      dogru,
      yanlis,
      basariYuzde: basari ?? null,
    });
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
  return { etiket: parcalar.join(" ").replace(/\s+/g, " ").trim(), sayilar };
}

function kazanimBasligiMi(raw: string): boolean {
  const key = raw.replace(/\s+/g, "").toLocaleUpperCase("tr");
  return /^(TÜRKÇE|TURKCE|SOSYAL|T\.?MAT|GEO-?1|TAR-?1|COĞ-?1|COG-?1|FEL-?1|DİN-?1|DIN-?1|FİZ-?1|FIZ-?1|KİM-?1|KIM-?1|BİY-?1|BIY-?1|MATEMATİK|MATEMATIK|FİZİK|FIZIK|KİMYA|KIMYA|BİYOLOJİ|BIYOLOJI|TARİH|TARIH|COĞRAFYA|COGRAFYA|FELSEFE|DİN)/.test(
    key,
  );
}

function sinavDersleri(dersler: ParsedSubject[]): ParsedSubject[] {
  return dersler.filter((d) => SINAV_GRUP_SET.has(d.dersGrubu));
}

function gruplardanToplam(dersler: ParsedSubject[]): ParsedTotals {
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

function bosRanks(): ParsedRanks {
  return { sinif: null, kurum: null, ilce: null, il: null, genel: null };
}

