/**
 * Gelistirme araci: verilen kullanici icin gecerli bir oturum cerezi uretir.
 * Panel sayfalarini tarayici olmadan denemek icin kullanilir.
 *
 *   npx tsx scripts/dev-oturum.ts ankaderslik
 */
import { PrismaClient } from "@prisma/client";
import { oturumTokeniUret } from "../lib/auth/session";
import { gecerliRolMu } from "../lib/auth/roller";

const prisma = new PrismaClient();

async function main() {
  const kullaniciAdi = process.argv[2] ?? "ankaderslik";

  const user = await prisma.user.findUnique({
    where: { kullaniciAdi },
    include: { institution: { select: { id: true, slug: true } } },
  });
  if (!user) throw new Error(`${kullaniciAdi} bulunamadi.`);
  if (!gecerliRolMu(user.rol)) throw new Error(`Tanimsiz rol: ${user.rol}`);

  const token = await oturumTokeniUret({
    userId: user.id,
    kullaniciAdi: user.kullaniciAdi,
    adSoyad: user.adSoyad,
    rol: user.rol,
    institutionId: user.institutionId ?? null,
    institutionSlug: user.institution?.slug ?? null,
  });

  console.log(token);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
