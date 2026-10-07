import { leftLines, rightLines, type PdfLine, type PdfPage, type PdfToken } from "../extract";
import { parseTrNumber } from "../parseUtils";
import type { KolonBandi } from "./schema";

export function derleDesen(raw: string): RegExp | null {
  const metin = raw.trim();
  if (!metin) return null;
  try {
    return new RegExp(metin, "im");
  } catch {
    return null;
  }
}

export function satirEslese(line: PdfLine, desen: string): boolean {
  const re = derleDesen(desen);
  if (!re) return false;
  if (re.test(line.text)) return true;
  const gevsek = desen.replace(/^\^/, "").replace(/\$$/, "").trim();
  if (gevsek === desen.trim()) return false;
  const yedek = derleDesen(gevsek);
  return yedek ? yedek.test(line.text) : false;
}

export function bantSatirlari(page: PdfPage, bant: KolonBandi | "tam" | "sol" | "sag"): PdfLine[][] {
  if (bant === "sol") return [leftLines(page)];
  if (bant === "sag") return [rightLines(page)];
  if (bant === "her_iki") return [leftLines(page), rightLines(page)];
  return [page.lines];
}

export function topAraliginda(line: PdfLine, minTop: number, maxTop: number): boolean {
  if (minTop >= 0 && line.top < minTop) return false;
  if (maxTop >= 0 && line.top > maxTop) return false;
  return true;
}

export function tokenMerkez(token: PdfToken): number {
  return (token.x + token.endX) / 2;
}

export function enYakinKolon<T extends { x: number }>(
  token: PdfToken,
  kolonlar: T[],
  esik = 22,
): T | null {
  if (kolonlar.length === 0) return null;
  const merkez = tokenMerkez(token);
  let enIyi = kolonlar[0];
  let enIyiFark = Infinity;
  for (const kolon of kolonlar) {
    const fark = Math.abs(kolon.x - merkez);
    if (fark < enIyiFark) {
      enIyi = kolon;
      enIyiFark = fark;
    }
  }
  return enIyiFark <= esik ? enIyi : null;
}

export function satirSayilari(line: PdfLine): number[] {
  return line.tokens.map((t) => parseTrNumber(t.text)).filter((v): v is number => v !== null);
}

export function isimGibi(ad: string): boolean {
  const t = ad.replace(/\s+/g, " ").trim();
  if (t.length < 3 || t.length > 70) return false;
  if (/TYT|AYT|LGS|DENEME|PROVA|SINAV|SONUÇ|BELGE|TÜRKİYE\s+GENEL|PUAN|KATILIM|KARNE/i.test(t)) {
    return false;
  }
  if (/^\d+$/.test(t)) return false;
  return /[A-ZÇĞİÖŞÜa-zçğıöşü]{2,}/.test(t);
}

export function yildizdanNumara(ham: string): string | null {
  const eslesme = ham.match(/(\d{3,})(?=\*|\s|$)/);
  return eslesme?.[1] ?? (ham.replace(/[^\d]/g, "").length >= 3 ? ham.replace(/[^\d]/g, "") : null);
}

