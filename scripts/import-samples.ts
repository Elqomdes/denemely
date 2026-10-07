/**
 * Ornek PDF'leri seed kurumuna aktarir. Hem ic aktarma zincirini dogrular hem de
 * panelde gorulecek demo veriyi olusturur.
 *
 *   npx tsx scripts/import-samples.ts
 *
 * Ayni komut ikinci kez calistirildiginda kayit sayilari degismemeli (upsert).
 */
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { denemeyiKaydet } from "../lib/import/kaydet";
import { parseExamPdf } from "../lib/pdf/parseExamPdf";

const prisma = new PrismaClient();

const DOSYALAR = [
  { yol: "samples/deneme_schema_1.pdf", ad: "TYT Deneme 1", tarih: "2026-02-08" },
  { yol: "samples/deneme_schema_2.pdf", ad: "Aktif TYT 1", tarih: "2026-03-15" },
  { yol: "samples/deneme_schema_3.pdf", ad: "TYT İlk Prova", tarih: "2026-09-18" },
  { yol: "sample_deneme_4.pdf", ad: "ÇAP TYT 0", tarih: "2026-10-04" },
];

async function main() {
  const kurum = await prisma.institution.findUnique({ where: { slug: "anka-derslik" } });
  if (!kurum) throw new Error("Once `npm run db:seed` calistirin.");

  const yetkili = await prisma.user.findFirst({
    where: { institutionId: kurum.id },
    select: { id: true },
  });
  if (!yetkili) throw new Error("Kurum yetkilisi bulunamadi, seed'i calistirin.");

  for (const dosya of DOSYALAR) {
    const data = new Uint8Array(await readFile(dosya.yol));
    const parsed = await parseExamPdf(data, dosya.yol);

    const sonuc = await denemeyiKaydet({
      institutionId: kurum.id,
      yukleyenId: yetkili.id,
      parsed,
      denemeAdi: dosya.ad,
      tarih: new Date(`${dosya.tarih}T00:00:00.000Z`),
      sinavTuru: "TYT",
      kaynakDosya: dosya.yol,
    });

    console.log(
      `${dosya.ad}: ${sonuc.kaydedilenSonuc} sonuc kaydedildi, ${sonuc.eklenenOgrenci} yeni ogrenci olusturuldu.`,
    );
  }

  const [denemeSayisi, ogrenciSayisi, sonucSayisi, dersSayisi, kazanimSayisi, cevapSayisi] =
    await Promise.all([
      prisma.exam.count({ where: { institutionId: kurum.id } }),
      prisma.student.count({ where: { institutionId: kurum.id } }),
      prisma.examResult.count({ where: { exam: { institutionId: kurum.id } } }),
      prisma.subjectResult.count({ where: { examResult: { exam: { institutionId: kurum.id } } } }),
      prisma.topicResult.count({ where: { examResult: { exam: { institutionId: kurum.id } } } }),
      prisma.answerSheet.count({ where: { examResult: { exam: { institutionId: kurum.id } } } }),
    ]);

  console.log("\nVeritabani durumu:");
  console.log(`  Deneme        : ${denemeSayisi}`);
  console.log(`  Ogrenci       : ${ogrenciSayisi}`);
  console.log(`  Sonuc         : ${sonucSayisi}`);
  console.log(`  Ders satiri   : ${dersSayisi}`);
  console.log(`  Kazanim       : ${kazanimSayisi}`);
  console.log(`  Cevap dizisi  : ${cevapSayisi}`);

  // Iki denemeye de katilan ogrenciler, gelisim grafiklerinin calistigini gosterir.
  const cokDenemeliler = await prisma.student.findMany({
    where: { institutionId: kurum.id, sonuclar: { some: {} } },
    select: { adSoyad: true, _count: { select: { sonuclar: true } } },
  });
  const ikiDeneme = cokDenemeliler.filter((o) => o._count.sonuclar >= 2);
  console.log(`  Iki denemeye de katilan ogrenci: ${ikiDeneme.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
