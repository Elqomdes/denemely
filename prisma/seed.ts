/**
 * Baslangic verisi: Hedefly yoneticisi ve ornek PDF'lerdeki kurum.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { sifreHashle } from "../lib/auth/sifre";

const prisma = new PrismaClient();

const HEDEFLY_ADMIN = {
  kullaniciAdi: "hedefly",
  adSoyad: "Hedefly Yönetim",
  sifre: "Hedefly2026!",
};

const ORNEK_KURUM = {
  slug: "anka-derslik",
  ad: "Anka Derslik",
  il: "BOLU",
  ilce: "BOLU MERKEZ",
};

const ORNEK_KURUM_YETKILISI = {
  kullaniciAdi: "ankaderslik",
  adSoyad: "Anka Derslik Rehberlik",
  sifre: "Ankaderslik.2026",
  oncekiKullaniciAdi: "anka.rehberlik",
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { kullaniciAdi: HEDEFLY_ADMIN.kullaniciAdi },
    update: { adSoyad: HEDEFLY_ADMIN.adSoyad, rol: "SUPERADMIN", aktif: true },
    create: {
      kullaniciAdi: HEDEFLY_ADMIN.kullaniciAdi,
      adSoyad: HEDEFLY_ADMIN.adSoyad,
      sifreHash: await sifreHashle(HEDEFLY_ADMIN.sifre),
      rol: "SUPERADMIN",
    },
  });

  const kurum = await prisma.institution.upsert({
    where: { slug: ORNEK_KURUM.slug },
    update: { ad: ORNEK_KURUM.ad, il: ORNEK_KURUM.il, ilce: ORNEK_KURUM.ilce, aktif: true },
    create: ORNEK_KURUM,
  });

  const sifreHash = await sifreHashle(ORNEK_KURUM_YETKILISI.sifre);
  const eskiYetkili = await prisma.user.findUnique({
    where: { kullaniciAdi: ORNEK_KURUM_YETKILISI.oncekiKullaniciAdi },
  });
  const yetkili = eskiYetkili
    ? await prisma.user.update({
        where: { id: eskiYetkili.id },
        data: {
          kullaniciAdi: ORNEK_KURUM_YETKILISI.kullaniciAdi,
          adSoyad: ORNEK_KURUM_YETKILISI.adSoyad,
          sifreHash,
          institutionId: kurum.id,
          aktif: true,
        },
      })
    : await prisma.user.upsert({
        where: { kullaniciAdi: ORNEK_KURUM_YETKILISI.kullaniciAdi },
        update: { institutionId: kurum.id, aktif: true, sifreHash },
        create: {
          kullaniciAdi: ORNEK_KURUM_YETKILISI.kullaniciAdi,
          adSoyad: ORNEK_KURUM_YETKILISI.adSoyad,
          sifreHash,
          rol: "KURUM_YETKILISI",
          institutionId: kurum.id,
        },
      });

  console.log("Baslangic verisi hazir:");
  console.log(`  Hedefly yoneticisi : ${admin.kullaniciAdi} / ${HEDEFLY_ADMIN.sifre}`);
  console.log(`  Kurum              : ${kurum.ad} (/k/${kurum.slug})`);
  console.log(`  Kurum yetkilisi    : ${yetkili.kullaniciAdi} / ${ORNEK_KURUM_YETKILISI.sifre}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
