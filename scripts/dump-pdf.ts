/**
 * Yeni bir yayin formatini incelemek icin gelistirme araci.
 *
 *   npx tsx scripts/dump-pdf.ts samples/deneme_schema_1.pdf 1 sol
 */
import { readFile } from "node:fs/promises";
import { bandLines, extractPdfPages, type PdfLine } from "../lib/pdf/extract";

async function main() {
  const [file, pageArg, bandArg] = process.argv.slice(2);
  if (!file) {
    console.error("Kullanim: tsx scripts/dump-pdf.ts <dosya.pdf> [sayfa] [sol|sag|tum]");
    process.exit(1);
  }

  const pageNumber = Number(pageArg ?? 1);
  const band = (bandArg ?? "tum").toLowerCase();

  const data = new Uint8Array(await readFile(file));
  const pages = await extractPdfPages(data);
  const page = pages.find((p) => p.pageNumber === pageNumber);
  if (!page) throw new Error(`${pageNumber}. sayfa bulunamadi (toplam ${pages.length})`);

  console.log(`# ${file} sayfa ${pageNumber} — ${page.width.toFixed(1)}x${page.height.toFixed(1)}`);

  let lines: PdfLine[];
  if (band === "sol") lines = bandLines(page, 0, page.width / 2);
  else if (band === "sag") lines = bandLines(page, page.width / 2, page.width + 1000);
  else lines = page.lines;

  for (const line of lines) {
    const tokens = line.tokens
      .map((t) => `${t.text}[${t.x.toFixed(1)}→${t.endX.toFixed(1)}]`)
      .join(" ");
    console.log(`${line.top.toFixed(1).padStart(7)} :: ${tokens}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
