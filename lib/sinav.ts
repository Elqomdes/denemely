export const SINAV_TURLERI = ["TYT", "AYT"] as const;
export type SinavTuru = (typeof SINAV_TURLERI)[number];

export const TYT_GRUP_SIRASI = ["TYT Türkçe", "TYT Sosyal", "TYT Matematik", "TYT Fen"] as const;
export const AYT_GRUP_SIRASI = ["AYT Edebiyat", "AYT Sosyal", "AYT Matematik", "AYT Fen"] as const;

export const TYT_GRUP_SET = new Set<string>(TYT_GRUP_SIRASI);
export const AYT_GRUP_SET = new Set<string>(AYT_GRUP_SIRASI);
export const SINAV_GRUP_SET = new Set<string>([...TYT_GRUP_SIRASI, ...AYT_GRUP_SIRASI]);

export function parseSinavTuru(ham: unknown): SinavTuru {
  const deger = String(ham ?? "")
    .trim()
    .toLocaleUpperCase("tr");
  return deger === "AYT" ? "AYT" : "TYT";
}

export function grupKumesi(tur: SinavTuru): Set<string> {
  return tur === "AYT" ? AYT_GRUP_SET : TYT_GRUP_SET;
}

export function tercihEdilenGrupSirasi(tur: string): readonly string[] {
  return parseSinavTuru(tur) === "AYT" ? AYT_GRUP_SIRASI : TYT_GRUP_SIRASI;
}

/** Sonuçlarda görünen grupları sınav türüne göre sıralar; bilinmeyenleri sona ekler. */
export function mevcutGrupSirasi(tur: string, gruplar: Iterable<string>): string[] {
  const tercih = tercihEdilenGrupSirasi(tur);
  const set = new Set([...gruplar].filter(Boolean));
  if (set.size === 0) return [...tercih];
  const sirali = tercih.filter((grup) => set.has(grup));
  const diger = [...set]
    .filter((grup) => !tercih.includes(grup))
    .sort((a, b) => a.localeCompare(b, "tr"));
  return [...sirali, ...diger];
}

export function sinavQuery(tur: SinavTuru, extra?: Record<string, string | undefined>): string {
  const sorgu = new URLSearchParams();
  sorgu.set("sinav", tur);
  for (const [anahtar, deger] of Object.entries(extra ?? {})) {
    if (anahtar === "sinav" || !deger) continue;
    sorgu.set(anahtar, deger);
  }
  return sorgu.toString();
}
