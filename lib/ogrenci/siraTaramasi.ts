import { prisma } from "@/lib/db";
import { OpenAIHatasi, yapilandirilmisYanit } from "@/lib/openai/client";
import { normalizePersonName } from "@/lib/pdf/parseUtils";
import { ayniKelimelerFarkliSira, kelimeler } from "./benzerlik";
import { ogrencileriBirlestir } from "./islemler";

export interface SiraBirlesmesi {
  korunan: string;
  silinen: string;
  tasinan: number;
}

export interface SiraAtlamasi {
  a: string;
  b: string;
  neden: string;
}

export interface SiraTaramaSonucu {
  birlesen: SiraBirlesmesi[];
  atlanan: SiraAtlamasi[];
}

interface OgrenciSatiri {
  id: string;
  adSoyad: string;
  denemeIdleri: string[];
}

interface ModelEslesme {
  birinciId: string;
  ikinciId: string;
  kanonikAd: string;
  gerekce: string;
}

const SEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    eslesmeler: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          birinciId: { type: "string" },
          ikinciId: { type: "string" },
          kanonikAd: { type: "string" },
          gerekce: { type: "string" },
        },
        required: ["birinciId", "ikinciId", "kanonikAd", "gerekce"],
      },
    },
  },
  required: ["eslesmeler"],
} as const;

const SISTEM = `Türkçe öğrenci kayıtlarını tarıyorsun.
Bazı denemelerde ad "İSİM SOYİSİM", bazılarında "SOYİSİM İSİM" kodlanır ve aynı kişi iki kayıt gibi görünür.
Yalnızca aynı kelimelerin sırası değişmiş kayıtları eşleştir. Yalnızca soyadı ortak olan farklı kişileri eşleştirme.
kanonikAd, listedeki kelimelerle İSİM SOYİSİM sırasında yazılsın. Yeni isim uydurma. Id'leri listeden aynen kopyala.
Eşleşme yoksa eslesmeler boş dizi olsun.`;

function modelYanitiMi(value: unknown): value is { eslesmeler: ModelEslesme[] } {
  if (!value || typeof value !== "object" || !("eslesmeler" in value)) return false;
  const eslesmeler = (value as { eslesmeler?: unknown }).eslesmeler;
  return Array.isArray(eslesmeler);
}

function ayniKelimeKumesi(a: string, b: string): boolean {
  const sol = kelimeler(a);
  const sag = kelimeler(b);
  if (sol.length < 2 || sol.length !== sag.length) return false;
  return [...sol].sort().join("\0") === [...sag].sort().join("\0");
}

function ayniSira(a: string, b: string): boolean {
  return kelimeler(a).join(" ") === kelimeler(b).join(" ");
}

function ortakDenemeVar(a: OgrenciSatiri, b: OgrenciSatiri): boolean {
  const kume = new Set(a.denemeIdleri);
  return b.denemeIdleri.some((id) => kume.has(id));
}

function yazimiSec(kanonik: string, a: string, b: string): string {
  if (ayniSira(kanonik, a)) return a;
  if (ayniSira(kanonik, b)) return b;
  const temiz = kanonik.replace(/\s+/g, " ").trim();
  return temiz ? temiz.toLocaleUpperCase("tr") : a;
}

/**
 * Kurum kayıtlarını GPT-5.6 Sol ile tarar.
 * Yalnızca kelimeleri aynı olup sırası farklı olan ve aynı denemede birlikte
 * sonucu bulunmayan kayıtlar birleştirilir.
 */
export async function adSirasiTaraVeBirlestir(institutionId: string): Promise<SiraTaramaSonucu> {
  const [ogrenciler, yoksaymalar] = await Promise.all([
    prisma.student.findMany({
      where: { institutionId },
      select: { id: true, adSoyad: true, sonuclar: { select: { examId: true } } },
    }),
    prisma.studentMergeIgnore.findMany({
      where: { institutionId },
      select: { ogrenciAId: true, ogrenciBId: true },
    }),
  ]);

  const satirlar: OgrenciSatiri[] = ogrenciler.map((ogrenci) => ({
    id: ogrenci.id,
    adSoyad: ogrenci.adSoyad,
    denemeIdleri: ogrenci.sonuclar.map((sonuc) => sonuc.examId),
  }));
  const harita = new Map(satirlar.map((satir) => [satir.id, satir]));
  const yoksayilan = new Set(yoksaymalar.map((kayit) => `${kayit.ogrenciAId}|${kayit.ogrenciBId}`));

  let modelEslesmeleri: ModelEslesme[] = [];
  if (satirlar.length >= 2) {
    const liste = satirlar.map((satir) => `${satir.id}\t${satir.adSoyad}`).join("\n");
    try {
      const yanit = await yapilandirilmisYanit({
        sistem: SISTEM,
        kullanici: `Kayıtlar (id ve ad):\n${liste}`,
        semaAdi: "ad_sirasi_eslesmeleri",
        sema: SEMA as unknown as Record<string, unknown>,
        effort: "medium",
        gecerliMi: modelYanitiMi,
      });
      modelEslesmeleri = yanit.eslesmeler;
    } catch (error) {
      if (error instanceof OpenAIHatasi) {
        throw new Error(`İsim taraması tamamlanamadı: ${error.message}`);
      }
      throw error;
    }
  }

  const kanonik = new Map<string, string>();
  const adaylar = new Map<string, [string, string]>();

  const ekle = (aId: string, bId: string, onerilenAd?: string) => {
    if (!aId || !bId || aId === bId) return;
    const anahtar = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
    if (yoksayilan.has(anahtar) || adaylar.has(anahtar)) return;
    adaylar.set(anahtar, aId < bId ? [aId, bId] : [bId, aId]);
    if (onerilenAd?.trim()) kanonik.set(anahtar, onerilenAd.trim());
  };

  for (const eslesme of modelEslesmeleri) {
    ekle(eslesme.birinciId, eslesme.ikinciId, eslesme.kanonikAd);
  }

  for (let i = 0; i < satirlar.length; i++) {
    for (let j = i + 1; j < satirlar.length; j++) {
      if (ayniKelimelerFarkliSira(satirlar[i].adSoyad, satirlar[j].adSoyad)) {
        ekle(satirlar[i].id, satirlar[j].id);
      }
    }
  }

  const birlesen: SiraBirlesmesi[] = [];
  const atlanan: SiraAtlamasi[] = [];
  const silinen = new Set<string>();

  for (const [anahtar, [aId, bId]] of adaylar) {
    const a = harita.get(aId);
    const b = harita.get(bId);
    if (!a || !b || silinen.has(aId) || silinen.has(bId)) continue;

    if (!ayniKelimeKumesi(a.adSoyad, b.adSoyad)) {
      atlanan.push({ a: a.adSoyad, b: b.adSoyad, neden: "Kelimeler birebir aynı değil" });
      continue;
    }
    if (ortakDenemeVar(a, b)) {
      atlanan.push({ a: a.adSoyad, b: b.adSoyad, neden: "Aynı denemede ikisinin de sonucu var" });
      continue;
    }

    const secilen = yazimiSec(kanonik.get(anahtar) ?? "", a.adSoyad, b.adSoyad);
    const hedef = ayniSira(secilen, a.adSoyad) ? a : b;
    const kaynak = hedef === a ? b : a;

    const sonuc = await ogrencileriBirlestir({
      institutionId,
      hedefId: hedef.id,
      kaynakId: kaynak.id,
      korunacakAd: "hedef",
    });

    if (!ayniSira(secilen, hedef.adSoyad)) {
      await adGuncelle(institutionId, hedef.id, secilen, hedef.adSoyad);
    }

    silinen.add(kaynak.id);
    birlesen.push({
      korunan: ayniSira(secilen, hedef.adSoyad) ? hedef.adSoyad : secilen,
      silinen: kaynak.adSoyad,
      tasinan: sonuc.tasinanSonuc,
    });
  }

  return { birlesen, atlanan };
}

async function adGuncelle(institutionId: string, studentId: string, yeniAd: string, eskiAd: string) {
  const normalizedAd = normalizePersonName(yeniAd);
  const eski = normalizePersonName(eskiAd);
  if (!normalizedAd || normalizedAd === eski) return;

  const cakisan = await prisma.student.findFirst({
    where: { institutionId, normalizedAd, id: { not: studentId } },
    select: { id: true },
  });
  if (cakisan) return;

  await prisma.student.update({
    where: { id: studentId },
    data: { adSoyad: yeniAd.replace(/\s+/g, " ").trim(), normalizedAd },
  });
  await prisma.studentNameAlias.upsert({
    where: { institutionId_normalizedAd: { institutionId, normalizedAd: eski } },
    update: { studentId },
    create: { institutionId, studentId, normalizedAd: eski },
  });
}
