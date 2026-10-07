import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedExamFile } from "@/lib/pdf/types";

/**
 * Yuklenen PDF once ayristirilip gecici bir dosyaya yazilir. Onizleme ve
 * onay adimlari ayni istekte olmadigi icin sonucu bu sekilde tasiyoruz.
 */
const KLASOR = path.join(process.cwd(), "uploads");
const TOKEN_DESENI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface AsamaKaydi {
  token: string;
  institutionId: string;
  yukleyenId: string;
  dosyaAdi: string;
  yuklemeTarihi: string;
  parsed: ParsedExamFile;
}

function dosyaYolu(token: string): string {
  if (!TOKEN_DESENI.test(token)) throw new Error("Gecersiz yukleme kimligi.");
  return path.join(KLASOR, `${token}.json`);
}

export async function asamaKaydet(
  kayit: Omit<AsamaKaydi, "token" | "yuklemeTarihi">,
): Promise<string> {
  await mkdir(KLASOR, { recursive: true });
  const token = randomUUID();
  const tamKayit: AsamaKaydi = {
    ...kayit,
    token,
    yuklemeTarihi: new Date().toISOString(),
  };
  await writeFile(dosyaYolu(token), JSON.stringify(tamKayit), "utf8");
  return token;
}

/** Token baska bir kuruma aitse null doner. */
export async function asamaOku(token: string, institutionId: string): Promise<AsamaKaydi | null> {
  try {
    const icerik = await readFile(dosyaYolu(token), "utf8");
    const kayit = JSON.parse(icerik) as AsamaKaydi;
    if (kayit.institutionId !== institutionId) return null;
    return kayit;
  } catch {
    return null;
  }
}

export async function asamaSil(token: string): Promise<void> {
  try {
    await unlink(dosyaYolu(token));
  } catch {
    // Dosya yoksa sorun degil.
  }
}
