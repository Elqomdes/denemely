/**
 * Ayni ogrencinin farkli denemelerde farkli yazilmis kayitlarini bulur.
 *
 * Optik formda ogrenciler bazen ikinci adlarini kodluyor, bazen kodlamiyor
 * ("ALİ GÜLER" / "ALİ METEHAN GÜLER"), bazen bosluk atlaniyor ("BUSE İDE" /
 * "BUSEİDE") ya da Turkce karakter yerine duz harf kodlaniyor. Bu kayitlar
 * sistemde iki ayri ogrenci olarak gorunuyor.
 *
 * Yapay zeka yok: kural tabanli karsilastirma yapiliyor ve karar kullaniciya
 * birakiliyor. En onemli eleme kurali, ayni denemede ikisinin de sonucu
 * varsa bunlarin ayni kisi OLAMAYACAGI gercegi (bir ogrenci bir denemeye
 * bir kez girer).
 */

export type BirlestirmeGuveni = "yuksek" | "orta";

export interface AdayOgrenci {
  id: string;
  adSoyad: string;
  sinif: string | null;
  ogrenciNo: string | null;
  denemeSayisi: number;
  /** Ogrencinin sonucu bulunan deneme kimlikleri */
  denemeIdleri: string[];
}

export interface BirlestirmeAdayi {
  /** Adi daha eksiksiz olan kayit (birlestirmede varsayilan hedef) */
  hedef: AdayOgrenci;
  kaynak: AdayOgrenci;
  neden: string;
  guven: BirlestirmeGuveni;
}

/** Turkce harfleri duz karsiliklarina indirger; optik form yazim farklarini tolere eder. */
export function asciiKarsilik(raw: string): string {
  // Not: once tr yerel ayariyla buyuk harfe cevrildigi icin yalnizca buyuk
  // harf karsiliklari yeterli ("i" -> "İ", "ı" -> "I").
  const harfler: Record<string, string> = {
    Ç: "C",
    Ğ: "G",
    İ: "I",
    Ö: "O",
    Ş: "S",
    Ü: "U",
    Â: "A",
    Î: "I",
    Û: "U",
  };
  return raw
    .toLocaleUpperCase("tr")
    .split("")
    .map((harf) => harfler[harf] ?? harf)
    .join("");
}

export function kelimeler(ad: string): string[] {
  return asciiKarsilik(ad)
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((kelime) => kelime.length > 0);
}

function bosluksuz(ad: string): string {
  return kelimeler(ad).join("");
}

/** Klasik Levenshtein mesafesi */
export function harfMesafesi(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let onceki = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const simdiki = [i];
    for (let j = 1; j <= b.length; j++) {
      const bedel = a[i - 1] === b[j - 1] ? 0 : 1;
      simdiki[j] = Math.min(simdiki[j - 1] + 1, onceki[j] + 1, onceki[j - 1] + bedel);
    }
    onceki = simdiki;
  }
  return onceki[b.length];
}

interface Karar {
  neden: string;
  guven: BirlestirmeGuveni;
}

/** Aynı kelimeler, farklı sıra: "EBRAR BAYRAM" ile "BAYRAM EBRAR". */
export function ayniKelimelerFarkliSira(a: string, b: string): boolean {
  const sol = kelimeler(a);
  const sag = kelimeler(b);
  if (sol.length < 2 || sol.length !== sag.length) return false;
  if (sol.join(" ") === sag.join(" ")) return false;
  return [...sol].sort().join("\0") === [...sag].sort().join("\0");
}

/** Iki kaydin ayni kisi olup olabilecegine dair kural tabanli karar. */
export function ikiliKarsilastir(a: AdayOgrenci, b: AdayOgrenci): Karar | null {
  // Bir ogrenci bir denemeye bir kez girer: ayni denemede ikisi de varsa ayri kisilerdir.
  const ortakDeneme = a.denemeIdleri.some((id) => b.denemeIdleri.includes(id));
  if (ortakDeneme) return null;

  const aKelime = kelimeler(a.adSoyad);
  const bKelime = kelimeler(b.adSoyad);
  if (aKelime.length === 0 || bKelime.length === 0) return null;

  const aDuz = bosluksuz(a.adSoyad);
  const bDuz = bosluksuz(b.adSoyad);
  if (aDuz.length < 4 || bDuz.length < 4) return null;

  // 1) Yalnizca bosluk veya Turkce karakter farki
  if (aDuz === bDuz) {
    return { neden: "Yazım/boşluk farkı, harfler birebir aynı", guven: "yuksek" };
  }

  const aSoyad = aKelime[aKelime.length - 1];
  const bSoyad = bKelime[bKelime.length - 1];
  const aIlk = aKelime[0];
  const bIlk = bKelime[0];

  // 2) Bir kayitta ara isim eksik: "ALI GULER" ile "ALI METEHAN GULER"
  if (aSoyad === bSoyad && aIlk === bIlk && aKelime.length !== bKelime.length) {
    const kisa = aKelime.length < bKelime.length ? aKelime : bKelime;
    const uzun = aKelime.length < bKelime.length ? bKelime : aKelime;
    const altKume = kisa.every((kelime) => uzun.includes(kelime));
    if (altKume) {
      return { neden: "Bir kayıtta ikinci ad kodlanmamış", guven: "yuksek" };
    }
  }

  // 3) Ad ve soyad ayni, ara isim farkli yazilmis
  if (aSoyad === bSoyad && aIlk === bIlk && aKelime.length === bKelime.length) {
    return { neden: "Ad ve soyad aynı, ara isim farklı yazılmış", guven: "orta" };
  }

  // 4) Soyad ayni, adin birinde harf eksigi/fazlasi var
  if (aSoyad === bSoyad) {
    const mesafe = harfMesafesi(aIlk, bIlk);
    if (mesafe > 0 && mesafe <= 1 && Math.min(aIlk.length, bIlk.length) >= 4) {
      return { neden: "Soyad aynı, adda tek harf farkı", guven: "orta" };
    }
  }

  // 5) Tum adda kucuk yazim farki
  const tolerans = Math.min(aDuz.length, bDuz.length) >= 8 ? 2 : 1;
  const mesafe = harfMesafesi(aDuz, bDuz);
  if (mesafe > 0 && mesafe <= tolerans) {
    return {
      neden: `Yazımda ${mesafe} harf farkı var`,
      guven: "orta",
    };
  }

  return null;
}

/** Kurumdaki tum kayitlari karsilastirip birlestirme adaylarini dondurur. */
export function adaylariBul(ogrenciler: AdayOgrenci[]): BirlestirmeAdayi[] {
  const adaylar: BirlestirmeAdayi[] = [];

  for (let i = 0; i < ogrenciler.length; i++) {
    for (let j = i + 1; j < ogrenciler.length; j++) {
      const karar = ikiliKarsilastir(ogrenciler[i], ogrenciler[j]);
      if (!karar) continue;

      // Adi daha uzun/eksiksiz olan kayit hedef kabul edilir.
      const [hedef, kaynak] =
        kelimeler(ogrenciler[i].adSoyad).length >= kelimeler(ogrenciler[j].adSoyad).length
          ? [ogrenciler[i], ogrenciler[j]]
          : [ogrenciler[j], ogrenciler[i]];

      adaylar.push({ hedef, kaynak, neden: karar.neden, guven: karar.guven });
    }
  }

  return adaylar.sort((a, b) => {
    if (a.guven !== b.guven) return a.guven === "yuksek" ? -1 : 1;
    return a.hedef.adSoyad.localeCompare(b.hedef.adSoyad, "tr");
  });
}
