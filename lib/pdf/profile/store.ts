import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import type { PdfPage } from "../extract";
import { sayfaMetni } from "./dump";
import { derleDesen } from "./helpers";
import type { FormatProfile } from "./schema";

const KLASOR = path.join(process.cwd(), "data", "format-profiles");

let onbellek: FormatProfile[] | null = null;

function profilGecerliMi(ham: unknown): ham is FormatProfile {
  if (!ham || typeof ham !== "object") return false;
  const aday = ham as FormatProfile;
  return Boolean(aday.id && aday.tespit?.zorunlu?.length);
}

export async function profilleriYukle(zorla = false): Promise<FormatProfile[]> {
  if (onbellek && !zorla) return onbellek;
  const byId = new Map<string, FormatProfile>();

  for (const profil of await dosyadanProfiller()) {
    byId.set(profil.id, profil);
  }
  for (const profil of await veritabanindanProfiller()) {
    byId.set(profil.id, profil);
  }

  onbellek = [...byId.values()];
  return onbellek;
}

async function dosyadanProfiller(): Promise<FormatProfile[]> {
  try {
    const dosyalar = (await readdir(KLASOR)).filter((ad) => ad.endsWith(".json"));
    const profiller: FormatProfile[] = [];
    for (const dosya of dosyalar) {
      try {
        const ham = JSON.parse(await readFile(path.join(KLASOR, dosya), "utf8")) as unknown;
        if (profilGecerliMi(ham)) profiller.push(ham);
      } catch {
        // Bozuk profil dosyası yok sayılır.
      }
    }
    return profiller;
  } catch {
    return [];
  }
}

async function veritabanindanProfiller(): Promise<FormatProfile[]> {
  try {
    const kayitlar = await prisma.pdfFormatProfile.findMany();
    const profiller: FormatProfile[] = [];
    for (const kayit of kayitlar) {
      try {
        const ham = JSON.parse(kayit.json) as unknown;
        if (profilGecerliMi(ham)) profiller.push({ ...ham, id: kayit.id });
      } catch {
        // Bozuk JSON yok sayılır.
      }
    }
    return profiller;
  } catch (error) {
    console.warn("PDF sablonlari veritabanindan okunamadi:", error);
    return [];
  }
}

export async function eslesenProfil(page: PdfPage): Promise<FormatProfile | null> {
  const metin = sayfaMetni(page);
  const profiller = await profilleriYukle();
  for (const profil of profiller) {
    if (profilEslese(profil, metin)) return profil;
  }
  return null;
}

export function profilEslese(profil: FormatProfile, metin: string): boolean {
  if (!profil.tespit.zorunlu.length) return false;
  const zorunlu = profil.tespit.zorunlu.every((desen) => {
    const re = derleDesen(desen);
    return re ? re.test(metin) : false;
  });
  if (!zorunlu) return false;
  if (profil.tespit.istege_bagli.length === 0) return true;
  return profil.tespit.istege_bagli.some((desen) => {
    const re = derleDesen(desen);
    return re ? re.test(metin) : false;
  });
}

export async function profilKaydet(profil: FormatProfile): Promise<FormatProfile> {
  const id = profil.id || slugUret(profil.ad || profil.yayin || "profil");
  const mevcut = await profilleriYukle(true);
  let benzersiz = id;
  let n = 2;
  while (mevcut.some((p) => p.id === benzersiz)) {
    benzersiz = `${id}-${n}`;
    n += 1;
  }
  const kayit = { ...profil, id: benzersiz };
  const json = JSON.stringify(kayit);

  try {
    await prisma.pdfFormatProfile.upsert({
      where: { id: benzersiz },
      create: { id: benzersiz, json },
      update: { json },
    });
  } catch (error) {
    console.warn("PDF sablonu veritabanina yazilamadi, dosyaya denenecek:", error);
    try {
      await mkdir(KLASOR, { recursive: true });
      await writeFile(path.join(KLASOR, `${benzersiz}.json`), JSON.stringify(kayit, null, 2), "utf8");
    } catch (dosyaHatasi) {
      console.error("PDF sablonu kaydedilemedi:", dosyaHatasi);
    }
  }

  onbellek = null;
  return kayit;
}

export function slugUret(ad: string): string {
  const slug = ad
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9çğıöşü]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "profil";
}
