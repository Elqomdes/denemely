import type { PdfPage } from "../extract";

/** GPT-5.6 Sol'a gidecek sıkıştırılmış sayfa dökümü: satır + token x aralıkları. */
export function sayfaDokumu(page: PdfPage): string {
  const satirlar = page.lines.map((line, index) => {
    const tokenlar = line.tokens
      .map((t) => `${temizle(t.text)}@${Math.round(t.x)}-${Math.round(t.endX)}`)
      .join(" ");
    return `${String(index).padStart(3)} y${Math.round(line.top)} ${tokenlar}`;
  });
  return [`sayfa ${page.pageNumber} ${Math.round(page.width)}x${Math.round(page.height)}`, ...satirlar].join(
    "\n",
  );
}

export function sayfaMetni(page: PdfPage): string {
  return page.lines.map((line) => line.text).join("\n");
}

function temizle(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, 80);
}

