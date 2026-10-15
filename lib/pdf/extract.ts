/**
 * PDF metin katmanini koordinatlariyla birlikte cikarir.
 *
 * Deneme sonuc belgeleri iki kolonlu tablolardan olusuyor ve sayilar hucre
 * hucre konumlandiriliyor. Bu yuzden duz metin yerine "token + x/y" seviyesinde
 * calisiyoruz: satirlari y'ye gore kumeliyor, gerektiginde x bandina gore
 * (sol/sag kolon) ayiriyoruz.
 */

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PDFJS_SURUM = "5.7.284";
const PDFJS_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_SURUM}`;

const PromiseApi = Promise as unknown as {
  withResolvers?: <T>() => {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
  };
};
if (typeof PromiseApi.withResolvers !== "function") {
  // pdfjs 5 Node 22 ister; Vercel bazen 20 calistirir.
  PromiseApi.withResolvers = <T>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

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

export class PdfOkumaHatasi extends Error {
  constructor(
    message: string,
    public readonly kod: "bozuk" | "sifreli" | "okuyucu" | "bos",
  ) {
    super(message);
    this.name = "PdfOkumaHatasi";
  }
}

export async function extractPdfPages(data: Uint8Array): Promise<PdfPage[]> {
  if (data.byteLength < 8) {
    throw new PdfOkumaHatasi("Dosya boş veya yükleme yarım kaldı. PDF'i yeniden seçin.", "bos");
  }

  const bas = new TextDecoder("latin1").decode(data.subarray(0, 1024));
  if (!bas.includes("%PDF")) {
    throw new PdfOkumaHatasi(
      "Bu dosya PDF görünmüyor. Sonuç belgesini PDF olarak kaydedip yeniden yükleyin.",
      "bozuk",
    );
  }

  const ortam = globalThis as { Worker?: typeof Worker };
  const oncekiWorker = ortam.Worker;
  // Node 22'de Worker var; pdfjs tarayici sanip worker dosyasi arar.
  // Modul yuklenmeden kapatilir; aksi halde import asamasinda dusebilir.
  ortam.Worker = undefined;

  let pdfjs: PdfjsModule;
  try {
    pdfjs = await loadPdfjs();
  } catch (error) {
    ortam.Worker = oncekiWorker;
    console.error("pdfjs yuklenemedi:", error);
    throw new PdfOkumaHatasi(
      "PDF okuyucu bu sunucuda açılamadı. Biraz sonra tekrar deneyin.",
      "okuyucu",
    );
  }

  const kok = pdfjsKok();
  const kopya = new Uint8Array(data.byteLength);
  kopya.set(data);

  const klasorUrl = (alt: string) => {
    const klasor = path.join(kok, alt);
    if (!existsSync(klasor)) return `${PDFJS_CDN}/${alt}/`;
    return pathToFileURL(klasor + path.sep).href;
  };

  try {
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = "";
    }

    const doc = await pdfjs.getDocument({
      data: kopya,
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
      isEvalSupported: false,
      useWasm: false,
      isOffscreenCanvasSupported: false,
      useWorkerFetch: false,
      disableWorker: true,
      cMapUrl: klasorUrl("cmaps"),
      cMapPacked: true,
      standardFontDataUrl: klasorUrl("standard_fonts"),
    } as Parameters<typeof pdfjs.getDocument>[0]).promise;

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
  } catch (error) {
    throw pdfHatasiDonustur(error);
  } finally {
    ortam.Worker = oncekiWorker;
  }
}

function pdfHatasiDonustur(error: unknown): PdfOkumaHatasi {
  const mesaj = error instanceof Error ? error.message : String(error);
  const ad = error instanceof Error ? error.name : "";
  if (/password|encrypted/i.test(mesaj) || ad === "PasswordException") {
    return new PdfOkumaHatasi("Bu PDF şifreli. Korumasız kopyasını yükleyin.", "sifreli");
  }
  if (/Invalid PDF|Missing PDF|bad xref|FormatError/i.test(mesaj) || ad === "InvalidPDFException") {
    return new PdfOkumaHatasi(
      "PDF açılamadı. Dosya bozulmuş veya tarayıcı yüklemeyi yarıda kesmiş olabilir. Yeniden kaydedip deneyin.",
      "bozuk",
    );
  }
  console.error("PDF okuyucu hatasi:", error);
  return new PdfOkumaHatasi(
    "PDF okuyucu bu sunucuda dosyayı işleyemedi. Biraz sonra tekrar deneyin.",
    "okuyucu",
  );
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
    pdfjsPromise = pdfjsDosyadanYukle().catch((error) => {
      pdfjsPromise = null;
      throw error;
    });
  }
  return pdfjsPromise;
}

async function pdfjsDosyadanYukle(): Promise<PdfjsModule> {
  const dosya = path.join(pdfjsKok(), "legacy", "build", "pdf.mjs");
  if (!existsSync(dosya)) {
    throw new Error(`pdfjs bulunamadi: ${dosya}`);
  }
  // Dosya URL'si webpack'in paketi require() etmesini engeller; Vercel'de ESM olarak acilir.
  return (await import(pathToFileURL(dosya).href)) as unknown as PdfjsModule;
}

function pdfjsKok(): string {
  const adaylar: string[] = [];
  try {
    adaylar.push(
      path.dirname(createRequire(pathToFileURL(path.join(process.cwd(), "package.json")).href).resolve("pdfjs-dist/package.json")),
    );
  } catch {
    // cwd uzerinden cozulemedi.
  }
  try {
    adaylar.push(path.dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json")));
  } catch {
    // bundle konumundan cozulemedi.
  }
  adaylar.push(path.join(process.cwd(), "node_modules", "pdfjs-dist"));
  const bulunan = adaylar.find((kok) => existsSync(path.join(kok, "legacy", "build", "pdf.mjs")));
  return bulunan ?? adaylar[adaylar.length - 1];
}
