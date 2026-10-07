/**
 * PDF metin katmanini koordinatlariyla birlikte cikarir.
 *
 * Deneme sonuc belgeleri iki kolonlu tablolardan olusuyor ve sayilar hucre
 * hucre konumlandiriliyor. Bu yuzden duz metin yerine "token + x/y" seviyesinde
 * calisiyoruz: satirlari y'ye gore kumeliyor, gerektiginde x bandina gore
 * (sol/sag kolon) ayiriyoruz.
 */

export interface PdfToken {
  text: string;
  /** Sol kenar (PDF punto birimi) */
  x: number;
  /** Sag kenar */
  endX: number;
  /** Sayfa ustunden uzaklik; buyudukce asagi iner */
  top: number;
}

export interface PdfLine {
  top: number;
  tokens: PdfToken[];
  /** Tokenlarin x sirasinda tek bosluklu birlesimi */
  text: string;
  minX: number;
  maxX: number;
}

export interface PdfPage {
  pageNumber: number;
  width: number;
  height: number;
  tokens: PdfToken[];
  /** Tum sayfa genisliginde kumelenmis satirlar */
  lines: PdfLine[];
}

/**
 * Ayni mantiksal satirin parcalari 1.5 punto icinde kalıyor (buyuk puntolu
 * sayilarin ondalik kismi biraz kayik basiliyor). Kazanim satirlari arasi
 * bosluk ~6 punto oldugu icin bu tolerans guvenli.
 */
const LINE_TOLERANCE = 1.5;

export async function extractPdfPages(data: Uint8Array): Promise<PdfPage[]> {
  const pdfjs = await loadPdfjs();

  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: false,
    // Yalnizca metin katmani lazim; font dosyalarini yuklemeye calismasin.
    disableFontFace: true,
    // Standart font uyarilarini bastir (VerbosityLevel.ERRORS)
    verbosity: 0,
  }).promise;

  try {
    const pages: PdfPage[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const tokens: PdfToken[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const text = item.str;
        if (text.length === 0) continue;
        if (text.trim().length === 0) continue;

        const x = item.transform[4] as number;
        const baseline = item.transform[5] as number;
        tokens.push({
          text,
          x,
          endX: x + (item.width ?? 0),
          top: viewport.height - baseline,
        });
      }

      pages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        tokens,
        lines: groupIntoLines(tokens),
      });

      page.cleanup();
    }
    return pages;
  } finally {
    await doc.destroy();
  }
}

/** Verilen x bandindaki (kolon) tokenlari yeniden satirlara boler. */
export function bandLines(page: PdfPage, minX: number, maxX: number): PdfLine[] {
  const inBand = page.tokens.filter((token) => {
    const center = (token.x + token.endX) / 2;
    return center >= minX && center < maxX;
  });
  return groupIntoLines(inBand);
}

/** Sol kolon (ozet + ders tablosu + cevaplar) */
export function leftLines(page: PdfPage): PdfLine[] {
  return bandLines(page, 0, page.width / 2);
}

/** Sag kolon (kazanim analizi) */
export function rightLines(page: PdfPage): PdfLine[] {
  return bandLines(page, page.width / 2, page.width + 1000);
}

function groupIntoLines(tokens: PdfToken[]): PdfLine[] {
  const sorted = [...tokens].sort((a, b) => a.top - b.top || a.x - b.x);
  const groups: PdfToken[][] = [];
  let current: PdfToken[] = [];
  let lastTop = Number.NaN;

  for (const token of sorted) {
    if (current.length === 0 || Math.abs(token.top - lastTop) <= LINE_TOLERANCE) {
      current.push(token);
    } else {
      groups.push(current);
      current = [token];
    }
    lastTop = token.top;
  }
  if (current.length > 0) groups.push(current);

  return groups.map((group) => {
    const ordered = [...group].sort((a, b) => a.x - b.x);
    return {
      top: ordered.reduce((min, t) => Math.min(min, t.top), Infinity),
      tokens: ordered,
      text: ordered
        .map((t) => t.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
      minX: ordered[0].x,
      maxX: ordered.reduce((max, t) => Math.max(max, t.endX), -Infinity),
    };
  });
}

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // Node tarafinda worker'siz calisan legacy derleme kullaniliyor.
      const mod = (await import(
        "pdfjs-dist/legacy/build/pdf.mjs"
      )) as unknown as PdfjsModule;
      return mod;
    })();
  }
  return pdfjsPromise;
}
