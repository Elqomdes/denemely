import type { PdfLine, PdfToken } from "./extract";

/** "19,50" -> 19.5 ; "-0,25" -> -0.25 ; "% 68" -> 68 ; "1.234,5" -> 1234.5 */
export function parseTrNumber(raw: string): number | null {
  const cleaned = raw.replace(/[%\s]/g, "");
  if (cleaned.length === 0) return null;
  if (!/^-?[\d.,]+$/.test(cleaned)) return null;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function isNumericToken(token: PdfToken): boolean {
  return parseTrNumber(token.text) !== null;
}

/** Karsilastirma icin ad/ders adi anahtari: kucuk harf, noktalama ve bosluk atilmis. */
export function normalizeKey(raw: string): string {
  return raw
    .toLocaleLowerCase("tr")
    .replace(/[^a-zçğıöşü0-9]+/g, "");
}

/** Kurum ici ogrenci eslestirmesi icin ad normalizasyonu (bosluklar korunur). */
export function normalizePersonName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleUpperCase("tr");
}

const GROUP_BY_SUBJECT: Record<string, string> = {};
const SUBJECT_GROUPS: Array<[string, string[]]> = [
  ["TYT Türkçe", ["Türkçe"]],
  [
    "TYT Sosyal",
    [
      "Tarih-1",
      "Tarih",
      "TAR-1",
      "Coğrafya-1",
      "Coğrafya",
      "COĞ-1",
      "Felsefe",
      "Felsefe (Seçmeli)",
      "FEL-1",
      "Din Kül. ve Ahl. Bil.",
      "Din Kültürü ve Ahlak Bilgisi",
      "Din Kültürü",
      "DİN-1",
      "SOSYAL",
    ],
  ],
  ["TYT Matematik", ["Matematik-1", "Matematik", "Geometri", "T. MAT", "T.MAT", "GEO-1"]],
  ["TYT Fen", ["Fizik", "Kimya", "Biyoloji", "FİZ-1", "KİM-1", "BİY-1"]],
];
for (const [group, subjects] of SUBJECT_GROUPS) {
  for (const subject of subjects) GROUP_BY_SUBJECT[normalizeKey(subject)] = group;
}

export const DERS_GRUBU_ADLARI = SUBJECT_GROUPS.map(([group]) => group);

/** Ders adindan ders grubunu bulur; bilinmeyenler icin anahtar kelimeye bakar. */
export function resolveDersGrubu(dersAdi: string, fallback?: string | null): string {
  const key = normalizeKey(dersAdi);
  const direct = GROUP_BY_SUBJECT[key];
  if (direct) return direct;

  // "TYT Sosyal" gibi grup satirlari
  for (const group of DERS_GRUBU_ADLARI) {
    if (normalizeKey(group) === key) return group;
  }

  if (/turkce|türkçe|dilanlatim/.test(key)) return "TYT Türkçe";
  if (/matematik|geometri/.test(key)) return "TYT Matematik";
  if (/fizik|kimya|biyoloji|fen/.test(key)) return "TYT Fen";
  if (/tarih|cografya|coğrafya|felsefe|din|sosyal/.test(key)) return "TYT Sosyal";

  return fallback ?? "Diğer";
}

export function isDersGrubuAdi(raw: string): boolean {
  const key = normalizeKey(raw);
  return DERS_GRUBU_ADLARI.some((group) => normalizeKey(group) === key);
}

/**
 * Cevap dizisi sabit adimli basiliyor (her soru icin ayni genislikte bir slot).
 * Cevap anahtari hicbir slotu bos birakmadigi icin adimi ondan olcuyoruz,
 * sonra ogrenci cevaplarini ayni cetvele oturtuyoruz. Boylece bos birakilan
 * sorular dogru indekste bosluk olarak kaliyor.
 */
export interface AnswerRuler {
  originX: number;
  pitch: number;
  length: number;
}

export function buildRuler(tokens: PdfToken[]): AnswerRuler | null {
  if (tokens.length === 0) return null;
  const originX = Math.min(...tokens.map((t) => t.x));
  const endX = Math.max(...tokens.map((t) => t.endX));
  const length = tokens.reduce((sum, t) => sum + t.text.length, 0);
  if (length === 0) return null;
  return { originX, pitch: (endX - originX) / length, length };
}

export function alignToRuler(tokens: PdfToken[], ruler: AnswerRuler): string {
  const slots = new Array<string>(ruler.length).fill(" ");
  for (const token of tokens) {
    let slot = Math.round((token.x - ruler.originX) / ruler.pitch);
    for (const char of token.text) {
      if (slot >= 0 && slot < ruler.length) slots[slot] = char;
      slot += 1;
    }
  }
  return slots.join("");
}

/**
 * Cevap anahtari bloklari: hicbir soru bos olmadigi icin bosluk icermez ve
 * tamami buyuk harftir. Iki karakter siniri, yanindaki kitapcik harfini
 * ("A", "B") anahtar sanmamizi engelliyor.
 */
export function isKeyToken(token: PdfToken): boolean {
  return /^[A-E]{2,}$/.test(token.text);
}

/**
 * Ogrenci cevap bloklari tek karakterli de olabilir (arada bos birakilmis
 * sorular tokeni bolüyor), bu yuzden uzunluk siniri yok. Konum filtresi
 * cagiran tarafta cetvele gore yapiliyor.
 */
export function isStudentAnswerToken(token: PdfToken): boolean {
  return /^[A-Ea-e ]+$/.test(token.text) && token.text.trim().length >= 1;
}

export function findLineIndex(
  lines: PdfLine[],
  predicate: (line: PdfLine) => boolean,
  from = 0,
): number {
  for (let i = from; i < lines.length; i++) {
    if (predicate(lines[i])) return i;
  }
  return -1;
}

/** Satir sonundaki n adet sayisal tokeni dondurur (yoksa null). */
export function trailingNumbers(line: PdfLine, count: number): number[] | null {
  const tokens = line.tokens;
  if (tokens.length < count + 1) return null;
  const tail = tokens.slice(tokens.length - count);
  const values: number[] = [];
  for (const token of tail) {
    const value = parseTrNumber(token.text);
    if (value === null) return null;
    values.push(value);
  }
  const label = tokens.slice(0, tokens.length - count);
  if (label.length === 0) return null;
  if (parseTrNumber(label[label.length - 1].text) !== null) return null;
  return values;
}

export function labelOf(line: PdfLine, numericCount: number): string {
  return line.tokens
    .slice(0, line.tokens.length - numericCount)
    .map((t) => t.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Bos (0 net) sorularin isaretlenmedigi durumlar icin: net = dogru - yanlis/4 */
export function hesaplaNet(dogru: number, yanlis: number): number {
  return Math.round((dogru - yanlis / 4) * 100) / 100;
}

/**
 * Bazi formatlarda tek dersli gruplar icin ayri bir grup satiri basilmiyor
 * (ornegin "Türkçe" satiri ayni zamanda "TYT Türkçe" toplamidir). Gruplar arasi
 * karsilastirmayi mumkun kilmak icin bu satirlari grup olarak isaretliyoruz.
 */
export function normalizeGroupFlags(
  dersler: Array<{ dersAdi: string; dersGrubu: string; isGrup: boolean }>,
): void {
  const gruplar = new Set(dersler.map((d) => d.dersGrubu));
  for (const grup of gruplar) {
    const uyeler = dersler.filter((d) => d.dersGrubu === grup);
    if (uyeler.some((d) => d.isGrup)) continue;
    if (uyeler.length === 1) uyeler[0].isGrup = true;
  }
}
