import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { ParsedExamFile } from "@/lib/pdf/types";

/**
 * Yuklenen PDF once ayristirilip gecici kayda yazilir. Onizleme ve onay
 * ayri istekler oldugu icin Vercel'de dosya sistemi kullanilamaz.
 */
const TOKEN_DESENI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SURE_MS = 2 * 60 * 60 * 1000;

export interface AsamaKaydi {
  token: string;
  institutionId: string;
  yukleyenId: string;
  dosyaAdi: string;
  yuklemeTarihi: string;
  parsed: ParsedExamFile;
}

export async function asamaKaydet(
  kayit: Omit<AsamaKaydi, "token" | "yuklemeTarihi">,
): Promise<string> {
  const token = randomUUID();
  const simdi = new Date();
  await prisma.pdfUploadDraft.create({
    data: {
      token,
      institutionId: kayit.institutionId,
      yukleyenId: kayit.yukleyenId,
      dosyaAdi: kayit.dosyaAdi,
      parsed: JSON.stringify(kayit.parsed),
      expiresAt: new Date(simdi.getTime() + SURE_MS),
    },
  });
  void prisma.pdfUploadDraft
    .deleteMany({ where: { expiresAt: { lt: simdi } } })
    .catch((error) => {
      console.warn("Suresi dolmus PDF taslagi silinemedi:", error);
    });
  return token;
}

/** Token baska bir kuruma aitse veya suresi dolmussa null doner. */
export async function asamaOku(token: string, institutionId: string): Promise<AsamaKaydi | null> {
  if (!TOKEN_DESENI.test(token)) return null;
  const kayit = await prisma.pdfUploadDraft.findUnique({ where: { token } });
  if (!kayit || kayit.institutionId !== institutionId) return null;
  if (kayit.expiresAt.getTime() <= Date.now()) {
    await prisma.pdfUploadDraft.delete({ where: { token } }).catch(() => undefined);
    return null;
  }
  try {
    return {
      token: kayit.token,
      institutionId: kayit.institutionId,
      yukleyenId: kayit.yukleyenId,
      dosyaAdi: kayit.dosyaAdi,
      yuklemeTarihi: kayit.createdAt.toISOString(),
      parsed: JSON.parse(kayit.parsed) as ParsedExamFile,
    };
  } catch {
    return null;
  }
}

export async function asamaSil(token: string): Promise<void> {
  if (!TOKEN_DESENI.test(token)) return;
  await prisma.pdfUploadDraft.delete({ where: { token } }).catch(() => undefined);
}
