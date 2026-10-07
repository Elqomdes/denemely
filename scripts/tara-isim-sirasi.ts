/**
 * Anka Derslik kayıtlarında ad/soyad sırası farkını tarar ve birleştirir.
 *
 *   npx tsx scripts/tara-isim-sirasi.ts
 */
import { PrismaClient } from "@prisma/client";
import { adSirasiTaraVeBirlestir } from "../lib/ogrenci/siraTaramasi";

const prisma = new PrismaClient();

async function main() {
  const kurum = await prisma.institution.findUnique({ where: { slug: "anka-derslik" } });
  if (!kurum) throw new Error("anka-derslik bulunamadı.");

  const sonuc = await adSirasiTaraVeBirlestir(kurum.id);
  console.log(`Birleşen: ${sonuc.birlesen.length}`);
  for (const kayit of sonuc.birlesen) {
    console.log(`  ${kayit.silinen} → ${kayit.korunan} (${kayit.tasinan} deneme)`);
  }
  console.log(`Atlanan: ${sonuc.atlanan.length}`);
  for (const kayit of sonuc.atlanan) {
    console.log(`  ${kayit.a} / ${kayit.b}: ${kayit.neden}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
