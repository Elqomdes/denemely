import { normalizeKey, resolveDersGrubu } from "@/lib/pdf/parseUtils";
import { SINAV_GRUP_SET } from "@/lib/sinav";

/**
 * TYT'nin tek ders listesi. Farkli yayinlar ayni dersi baska yazar
 * (Coğ-1 / Coğrafya-1, TAR-1 / Tarih-1); ekranda ve eslestirmede bu adlar kullanilir.
 */
export const TYT_DERSLERI = [
  "Türkçe",
  "Tarih",
  "Coğrafya",
  "Felsefe",
  "Din",
  "Matematik",
  "Geometri",
  "Fizik",
  "Kimya",
  "Biyoloji",
] as const;

/** normalizeKey Turkce harfleri birakir; takma adlar duz harfle durur. */
function dersAnahtari(hamAd: string): string {
  return normalizeKey(hamAd)
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ü", "u");
}

const TAKMA_ADLAR: Record<string, string> = {
  turkce: "Türkçe",
  tytturkce: "Türkçe",
  tarih: "Tarih",
  tarih1: "Tarih",
  tar1: "Tarih",
  cografya: "Coğrafya",
  cografya1: "Coğrafya",
  cog1: "Coğrafya",
  cog: "Coğrafya",
  felsefe: "Felsefe",
  fel1: "Felsefe",
  din: "Din",
  din1: "Din",
  dinkulturu: "Din",
  dinkulturuveahlakbilgisi: "Din",
  dinkulveahlbil: "Din",
  matematik: "Matematik",
  matematik1: "Matematik",
  tmat: "Matematik",
  geometri: "Geometri",
  geo1: "Geometri",
  geo: "Geometri",
  fizik: "Fizik",
  fiz1: "Fizik",
  kimya: "Kimya",
  kim1: "Kimya",
  biyoloji: "Biyoloji",
  biy1: "Biyoloji",
  edebiyat: "Edebiyat",
  turkdilipeedebiyati: "Edebiyat",
  turkdilipeedebiyat: "Edebiyat",
  tde: "Edebiyat",
  edeb: "Edebiyat",
  tarih2: "Tarih-2",
  tar2: "Tarih-2",
  tarih3: "Tarih-3",
  tar3: "Tarih-3",
  cografya2: "Coğrafya-2",
  cog2: "Coğrafya-2",
  cografya3: "Coğrafya-3",
  cog3: "Coğrafya-3",
  felsefegrubu: "Felsefe Grubu",
  fel2: "Felsefe Grubu",
  psiko: "Psikoloji",
  psikoloji: "Psikoloji",
  sosyo: "Sosyoloji",
  sosyoloji: "Sosyoloji",
  mantik: "Mantık",
  matematik2: "Matematik",
  aytmatematik: "Matematik",
  geo2: "Geometri",
  geometri2: "Geometri",
  ydil: "Yabancı Dil",
  yabancidil: "Yabancı Dil",
  dinsfel: "Din",
  sfel: "Din",
  fizik2: "Fizik",
  fiz2: "Fizik",
  kimya2: "Kimya",
  kim2: "Kimya",
  biyoloji2: "Biyoloji",
  biy2: "Biyoloji",
};

/** Bolum satiri. Alt ders degil; Sosyal ve Fen burada ders adi olmaz. */
const BOLUM_ADLARI = new Set([
  "tytsosyal",
  "sosyal",
  "tytfen",
  "fen",
  "tytmatematik",
  "aytsosyal",
  "aytfen",
  "aytedebiyat",
  "aytmatematik",
]);

const DERS_SIRASI = [
  ...TYT_DERSLERI,
  "Edebiyat",
  "Tarih-2",
  "Coğrafya-2",
  "Tarih-3",
  "Coğrafya-3",
  "Felsefe Grubu",
  "Psikoloji",
  "Sosyoloji",
  "Mantık",
  "Yabancı Dil",
];

export function dersSiraNo(dersAdi: string): number {
  const index = DERS_SIRASI.indexOf(dersAdi);
  return index === -1 ? 99 : index;
}

/**
 * Yayin etiketini TYT ders adina cevirir.
 * Felsefe (Secmeli) bu sinavlarda tamamen bos bir kolon; hesaba katilmaz.
 * Bolum basliklari (SOSYAL, FEN) ders degildir.
 */
export function kanonikDersAdi(hamAd: string): string | null {
  const anahtar = dersAnahtari(hamAd);
  if (!anahtar || anahtar === "felsefesecmeli" || BOLUM_ADLARI.has(anahtar)) return null;

  const dogrudan = TAKMA_ADLAR[anahtar];
  if (dogrudan) return dogrudan;

  if (anahtar.includes("edebiyat") || anahtar === "tde" || anahtar === "edeb") return "Edebiyat";
  if (anahtar.includes("turkce")) return "Türkçe";
  if (anahtar.includes("tarih3") || anahtar === "tar3") return "Tarih-3";
  if (anahtar.includes("tarih2") || anahtar === "tar2") return "Tarih-2";
  if (anahtar.includes("cografya3") || anahtar === "cog3") return "Coğrafya-3";
  if (anahtar.includes("cografya2") || anahtar === "cog2") return "Coğrafya-2";
  if (anahtar.includes("felsefegrubu")) return "Felsefe Grubu";
  if (anahtar.includes("psiko")) return "Psikoloji";
  if (anahtar.includes("sosyo")) return "Sosyoloji";
  if (anahtar.includes("mantik")) return "Mantık";
  if (anahtar.includes("ydil") || anahtar.includes("yabancidil")) return "Yabancı Dil";
  if (anahtar.includes("tarih") || anahtar.startsWith("tar")) return "Tarih";
  if (anahtar.includes("cograf") || anahtar.startsWith("cog")) return "Coğrafya";
  if (anahtar.includes("felsefe") || anahtar.startsWith("fel")) return "Felsefe";
  if (anahtar.includes("din")) return "Din";
  if (anahtar.includes("geo")) return "Geometri";
  if (anahtar.includes("matematik") || anahtar.includes("tmat")) return "Matematik";
  if (anahtar.includes("fizik") || anahtar.startsWith("fiz")) return "Fizik";
  if (anahtar.includes("kimya") || anahtar.startsWith("kim")) return "Kimya";
  if (anahtar.includes("biyoloji") || anahtar.startsWith("biy")) return "Biyoloji";

  return null;
}

/**
 * TYT matematik testi 30 matematik + 10 geometridir. Eski kayitlarda geometri
 * satiri da "Matematik" yazilmis olabilir; 10 soruluk parcayi ayiririz.
 */
export function tytMatematikParcasi(
  ders: { dersAdi: string; dersGrubu?: string; isGrup?: boolean; soru: number },
  ad: string,
): string {
  if (ad === "Geometri") return "Geometri";
  if (ad !== "Matematik" || ders.isGrup) return ad;
  const grup = ders.dersGrubu || resolveDersGrubu(ders.dersAdi);
  if (grup === "TYT Matematik" && ders.soru === 10) return "Geometri";
  return ad;
}

export interface HamDersSatiri {
  dersAdi: string;
  dersGrubu: string;
  isGrup: boolean;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  net: number;
  basariYuzde?: number | null;
  sinifOrt?: number | null;
  kurumOrt?: number | null;
}

export interface KanonikDersSatiri {
  dersAdi: string;
  dersGrubu: string;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  net: number;
  basariYuzde: number | null;
  sinifOrt: number | null;
  kurumOrt: number | null;
}

/** Bir denemedeki ders satirlarini tek listede toplar. TYT geometri matematikten ayri kalir. */
export function tekDenemeDersleri(dersler: HamDersSatiri[]): KanonikDersSatiri[] {
  const altDersGruplari = new Set<string>();
  for (const ders of dersler) {
    if (ders.isGrup) continue;
    const hamAd = kanonikDersAdi(ders.dersAdi);
    if (!hamAd) continue;
    const ad = tytMatematikParcasi(ders, hamAd);
    altDersGruplari.add(SINAV_GRUP_SET.has(ders.dersGrubu) ? ders.dersGrubu : resolveDersGrubu(ad));
  }

  const harita = new Map<string, KanonikDersSatiri>();
  const ekle = (ders: HamDersSatiri, ad: string) => {
    const dersGrubu = SINAV_GRUP_SET.has(ders.dersGrubu) ? ders.dersGrubu : resolveDersGrubu(ad);
    const mevcut = harita.get(ad);
    if (!mevcut) {
      harita.set(ad, {
        dersAdi: ad,
        dersGrubu,
        soru: ders.soru,
        dogru: ders.dogru,
        yanlis: ders.yanlis,
        bos: ders.bos,
        net: ders.net,
        basariYuzde: null,
        sinifOrt: ders.sinifOrt ?? null,
        kurumOrt: ders.kurumOrt ?? null,
      });
      return;
    }
    mevcut.soru += ders.soru;
    mevcut.dogru += ders.dogru;
    mevcut.yanlis += ders.yanlis;
    mevcut.bos += ders.bos;
    mevcut.net += ders.net;
    if (ders.sinifOrt != null) mevcut.sinifOrt = (mevcut.sinifOrt ?? 0) + ders.sinifOrt;
    if (ders.kurumOrt != null) mevcut.kurumOrt = (mevcut.kurumOrt ?? 0) + ders.kurumOrt;
  };

  for (const ders of dersler) {
    const hamAd = kanonikDersAdi(ders.dersAdi);
    if (!hamAd) continue;
    if (ders.isGrup && altDersGruplari.has(ders.dersGrubu)) continue;
    ekle(ders, tytMatematikParcasi(ders, hamAd));
  }

  return [...harita.values()]
    .map((ders) => ({
      ...ders,
      basariYuzde: ders.soru > 0 ? (ders.dogru / ders.soru) * 100 : null,
    }))
    .sort((a, b) => dersSiraNo(a.dersAdi) - dersSiraNo(b.dersAdi));
}
