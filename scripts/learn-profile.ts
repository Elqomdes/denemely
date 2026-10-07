/**
 * Tanınmayan bir sonuç PDF'inden GPT-5.6 Sol ile şablon profili üretir.
 *
 *   npx tsx scripts/learn-profile.ts samples/yeni_yayin.pdf
 *   npx tsx scripts/learn-profile.ts samples/deneme_schema_3.pdf --force
 *
 * --force gomulu formati atlar; ogrenme zincirini mevcut PDF'lerle dener.
 */
import { readFile } from "node:fs/promises";
import { extractPdfPages } from "../lib/pdf/extract";
import { detectFormat } from "../lib/pdf/detect";
import { yeniSablonOgren } from "../lib/pdf/profile/learn";
import { eslesenProfil } from "../lib/pdf/profile/store";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const yol = args.find((a) => !a.startsWith("--"));
  if (!yol) {
    console.error("Kullanim: tsx scripts/learn-profile.ts <dosya.pdf> [--force]");
    process.exit(1);
  }

  const data = new Uint8Array(await readFile(yol));
  const pages = await extractPdfPages(data);
  if (pages.length === 0) throw new Error("PDF sayfasi yok.");

  const gomulu = detectFormat(pages[0]);
  if (gomulu && !force) {
    console.log(`Gomulu format: ${gomulu}. Ogrenmeyi zorlamak icin --force ekleyin.`);
    process.exit(0);
  }

  const kayitli = await eslesenProfil(pages[0]);
  if (kayitli && !force) {
    console.log(`Kayitli profil: ${kayitli.id} (${kayitli.ad})`);
    process.exit(0);
  }

  console.log(`Ogreniliyor: ${yol} (${pages.length} sayfa)${gomulu ? ` [gomulu ${gomulu} atlandi]` : ""}`);
  const sonuc = await yeniSablonOgren(pages, yol);
  console.log(`Profil: ${sonuc.profil.id} — ${sonuc.profil.ad}`);
  console.log(`Ogrenci: ${sonuc.parsed.ogrenciler.length}`);
  console.log(`Dogrulama: ${sonuc.dogrulama.basariliSayfa}/${sonuc.dogrulama.toplamSayfa}`);
  if (sonuc.dogrulama.uyari.length) {
    console.log("Uyarilar:");
    for (const u of sonuc.dogrulama.uyari.slice(0, 8)) console.log(`  ${u}`);
  }
  const ilk = sonuc.parsed.ogrenciler[0];
  if (ilk) {
    console.log(
      `Ilk: ${ilk.ogrenciAdi} puan ${ilk.puan ?? "-"} net ${ilk.toplam.net} ders ${ilk.dersler.length} cvp ${ilk.cevaplar.length} kz ${ilk.kazanimlar.length}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
