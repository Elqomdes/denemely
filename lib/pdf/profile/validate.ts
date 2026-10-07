import { hesaplaNet } from "../parseUtils";
import type { ParsedExamFile, ParsedStudentPage } from "../types";
import { isimGibi } from "./helpers";

export interface ProfilDogrulama {
  gecerli: boolean;
  hatalar: string[];
  uyari: string[];
  basariliSayfa: number;
  toplamSayfa: number;
}

export function dogrulaParsedExam(parsed: ParsedExamFile): ProfilDogrulama {
  const hatalar: string[] = [];
  const uyari: string[] = [];
  const ogrenciler = parsed.ogrenciler;
  const toplamSayfa = Math.max(ogrenciler.length, 1);

  if (ogrenciler.length === 0) {
    return {
      gecerli: false,
      hatalar: ["Hiç öğrenci sayfası okunamadı."],
      uyari,
      basariliSayfa: 0,
      toplamSayfa: 0,
    };
  }

  let basarili = 0;
  let isimli = 0;
  let dersli = 0;

  for (const ogrenci of ogrenciler) {
    const sayfaHatalari = sayfaHatalariBul(ogrenci);
    if (isimGibi(ogrenci.ogrenciAdi)) isimli += 1;
    if (ogrenci.dersler.some((d) => d.isGrup && d.soru > 0)) dersli += 1;
    if (sayfaHatalari.length === 0) basarili += 1;
    else if (sayfaHatalari.length <= 2 && isimGibi(ogrenci.ogrenciAdi) && ogrenci.dersler.length > 0) {
      basarili += 1;
      uyari.push(`s${ogrenci.pageNumber} ${ogrenci.ogrenciAdi}: ${sayfaHatalari.join(" | ")}`);
    } else {
      hatalar.push(`s${ogrenci.pageNumber} ${ogrenci.ogrenciAdi || "?"}: ${sayfaHatalari.join(" | ")}`);
    }
  }

  const isimOrani = isimli / toplamSayfa;
  const dersOrani = dersli / toplamSayfa;
  const basariOrani = basarili / toplamSayfa;
  const puanli = ogrenciler.filter((o) => o.puan != null && o.puan > 0).length;
  const cevapli = ogrenciler.filter((o) => {
    const grup = o.dersler.filter((d) => d.isGrup).length;
    return o.cevaplar.length >= Math.min(3, Math.max(1, grup));
  }).length;

  if (isimOrani < 0.7) hatalar.push(`Öğrenci adı oranı düşük (${isimli}/${toplamSayfa}).`);
  if (dersOrani < 0.7) hatalar.push(`Ders tablosu oranı düşük (${dersli}/${toplamSayfa}).`);
  if (basariOrani < 0.7) hatalar.push(`Sayfa doğrulama oranı düşük (${basarili}/${toplamSayfa}).`);
  if (puanli / toplamSayfa < 0.6) hatalar.push(`Puan çoğu sayfada okunamadı (${puanli}/${toplamSayfa}).`);
  if (cevapli / toplamSayfa < 0.7) {
    hatalar.push(`Cevap anahtarı çoğu sayfada okunamadı (${cevapli}/${toplamSayfa}).`);
  }

  const adlar = ogrenciler.map((o) => o.ogrenciAdi).filter(Boolean);
  if (new Set(adlar).size === 1 && adlar.length > 3) {
    hatalar.push("Bütün sayfalarda aynı ad okundu; kimlik alanı yanlış hizalanmış olabilir.");
  }

  return {
    gecerli: hatalar.filter((h) => !h.startsWith("s")).length === 0 && basariOrani >= 0.7 && isimOrani >= 0.7,
    hatalar,
    uyari,
    basariliSayfa: basarili,
    toplamSayfa,
  };
}

function sayfaHatalariBul(ogrenci: ParsedStudentPage): string[] {
  const hatalar: string[] = [];
  if (!isimGibi(ogrenci.ogrenciAdi)) hatalar.push("öğrenci adı yok");

  const gruplar = ogrenci.dersler.filter((d) => d.isGrup);
  if (gruplar.length === 0) hatalar.push("ders grubu yok");
  if (gruplar.length >= 3 && ogrenci.cevaplar.length === 0) hatalar.push("cevap bloğu yok");
  if (ogrenci.puan == null) hatalar.push("puan yok");

  for (const ders of gruplar) {
    if (ders.soru <= 0) hatalar.push(`${ders.dersAdi} soru=0`);
    const beklenenBos = ders.soru - ders.dogru - ders.yanlis;
    if (Math.abs(ders.bos - beklenenBos) > 1) {
      hatalar.push(`${ders.dersAdi} D/Y/B uyumsuz`);
    }
    if (Math.abs(ders.net - hesaplaNet(ders.dogru, ders.yanlis)) > 0.26) {
      hatalar.push(`${ders.dersAdi} net uyumsuz`);
    }
  }

  for (const cevap of ogrenci.cevaplar) {
    if (cevap.cevapAnahtari.length < 5) {
      hatalar.push(`${cevap.dersGrubu} anahtar kısa`);
      continue;
    }
    if (cevap.ogrenciCevaplari.length !== cevap.cevapAnahtari.length) {
      hatalar.push(`${cevap.dersGrubu} cevap uzunluğu`);
    }
    const grup = gruplar.find((g) => g.dersGrubu === cevap.dersGrubu);
    if (!grup) continue;
    const D = [...cevap.ogrenciCevaplari].filter((c) => /[A-E]/.test(c)).length;
    const Y = [...cevap.ogrenciCevaplari].filter((c) => /[a-e]/.test(c)).length;
    if (Math.abs(D - grup.dogru) > 1 || Math.abs(Y - grup.yanlis) > 1) {
      hatalar.push(`${cevap.dersGrubu} cevap/tablo ${D}/${Y} vs ${grup.dogru}/${grup.yanlis}`);
    }
  }

  return hatalar;
}

