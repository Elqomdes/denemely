import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PdfPage } from "../extract";
import { sayfaMetni } from "./dump";
import { derleDesen } from "./helpers";
import type { FormatProfile } from "./schema";

const KLASOR = path.join(process.cwd(), "data", "format-profiles");

let onbellek: FormatProfile[] | null = null;

export async function profilleriYukle(zorla = false): Promise<FormatProfile[]> {
  if (onbellek && !zorla) return onbellek;
  try {
    const dosyalar = (await readdir(KLASOR)).filter((ad) => ad.endsWith(".json"));
    const profiller: FormatProfile[] = [];
    for (const dosya of dosyalar) {
      try {
        const ham = JSON.parse(await readFile(path.join(KLASOR, dosya), "utf8")) as FormatProfile;
        if (ham?.id && ham.tespit?.zorunlu?.length) profiller.push(ham);
      } catch {
        // Bozuk profil dosyası yok sayılır.
      }
    }
    onbellek = profiller;
    return profiller;
  } catch {
    onbellek = [];
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
  await mkdir(KLASOR, { recursive: true });
  const id = profil.id || slugUret(profil.ad || profil.yayin || "profil");
  const mevcut = await profilleriYukle(true);
  let benzersiz = id;
  let n = 2;
  while (mevcut.some((p) => p.id === benzersiz)) {
    benzersiz = `${id}-${n}`;
    n += 1;
  }
  const kayit = { ...profil, id: benzersiz };
  await writeFile(path.join(KLASOR, `${benzersiz}.json`), JSON.stringify(kayit, null, 2), "utf8");
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

