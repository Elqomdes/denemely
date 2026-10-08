"use server";

import { redirect } from "next/navigation";
import { prisma, veritabaniHazir } from "@/lib/db";
import { kullaniciAdiniNormallestir } from "./kullaniciAdi";
import { hizliHashMi, sifreDogruMu, sifreHashle } from "./sifre";
import { ROLLER, gecerliRolMu } from "./roller";
import { oturumuBaslat, oturumuKapat } from "./session";

export interface GirisDurumu {
  hata?: string;
}

function yonlendirmeHatasiMi(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

/**
 * Kullanici adi + sifre ile giris. E-posta ve self-servis kayit yok;
 * hesaplar Hedefly yonetim panelinden olusturulur.
 */
export async function girisYap(
  _oncekiDurum: GirisDurumu,
  formData: FormData,
): Promise<GirisDurumu> {
  const kullaniciAdi = kullaniciAdiniNormallestir(String(formData.get("kullaniciAdi") ?? ""));
  const sifre = String(formData.get("sifre") ?? "").trim();
  const kurumSlug = String(formData.get("kurumSlug") ?? "").trim();

  if (!kullaniciAdi || !sifre) {
    return { hata: "Kullanıcı adı ve şifre gerekli." };
  }

  const dbUrl = process.env.DENEMELY_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
    return { hata: "Veritabanı bağlantısı yok. Vercel'e DENEMELY_DATABASE_URL ekleyin." };
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    return { hata: "Oturum anahtarı yok. Vercel'e SESSION_SECRET ekleyin." };
  }

  let panelYolu: "/yonetim" | "/panel" = "/panel";

  try {
    await veritabaniHazir;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { kullaniciAdi },
          { kullaniciAdi: { equals: kullaniciAdi, mode: "insensitive" } },
        ],
      },
      include: { institution: { select: { id: true, slug: true, aktif: true } } },
    });

    const hataMesaji = "Kullanıcı adı veya şifre hatalı.";
    if (!user || !user.aktif) return { hata: hataMesaji };

    const eskiHash = !hizliHashMi(user.sifreHash);
    const sifreDogru = await sifreDogruMu(sifre, user.sifreHash);
    if (!sifreDogru) return { hata: hataMesaji };

    if (!gecerliRolMu(user.rol)) return { hata: "Hesap rolü tanımsız. Hedefly ile iletişime geçin." };

    if (user.rol === ROLLER.KURUM_YETKILISI) {
      if (!user.institution || !user.institution.aktif) {
        return { hata: "Kurum hesabı pasif durumda. Hedefly ile iletişime geçin." };
      }
      if (kurumSlug && user.institution.slug !== kurumSlug) {
        return { hata: "Bu hesap bu kurumun giriş sayfasına ait değil." };
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        sonGirisTarihi: new Date(),
        ...(eskiHash ? { sifreHash: await sifreHashle(sifre) } : {}),
        ...(user.kullaniciAdi !== kullaniciAdi ? { kullaniciAdi } : {}),
      },
    });

    await oturumuBaslat({
      userId: user.id,
      kullaniciAdi,
      adSoyad: user.adSoyad,
      rol: user.rol,
      institutionId: user.institutionId ?? null,
      institutionSlug: user.institution?.slug ?? null,
    });

    panelYolu = user.rol === ROLLER.SUPERADMIN ? "/yonetim" : "/panel";
  } catch (error) {
    if (yonlendirmeHatasiMi(error)) throw error;
    console.error("Giris hatasi:", error);
    return { hata: "Giriş şu an tamamlanamadı. Biraz sonra tekrar deneyin." };
  }

  redirect(panelYolu);
}

export async function cikisYap(): Promise<void> {
  await oturumuKapat();
  redirect("/giris");
}
