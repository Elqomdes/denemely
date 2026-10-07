"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sifreHashle } from "@/lib/auth/sifre";
import { superadminGerekli } from "@/lib/auth/guards";
import { ROLLER } from "@/lib/auth/roller";
import { prisma } from "@/lib/db";
import { slugOlustur } from "@/lib/format";

export interface FormDurumu {
  hata?: string;
  basari?: string;
}

const SLUG_DESENI = /^[a-z0-9-]+$/;
const KULLANICI_ADI_DESENI = /^[a-z0-9._-]{3,32}$/;
const EN_KISA_SIFRE = 8;

export async function kurumOlustur(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  await superadminGerekli();

  const ad = String(formData.get("ad") ?? "").trim();
  const slugGirdisi = String(formData.get("slug") ?? "").trim();
  const il = String(formData.get("il") ?? "").trim();
  const ilce = String(formData.get("ilce") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();

  if (ad.length < 2) return { hata: "Kurum adı en az 2 karakter olmalı." };

  const slug = slugGirdisi ? slugOlustur(slugGirdisi) : slugOlustur(ad);
  if (!SLUG_DESENI.test(slug)) {
    return { hata: "Adres yalnızca küçük harf, rakam ve tire içerebilir." };
  }

  const mevcut = await prisma.institution.findUnique({ where: { slug } });
  if (mevcut) return { hata: `"${slug}" adresi başka bir kurum tarafından kullanılıyor.` };

  const kurum = await prisma.institution.create({
    data: {
      ad,
      slug,
      il: il || null,
      ilce: ilce || null,
      logoUrl: logoUrl || null,
    },
    select: { id: true },
  });

  revalidatePath("/yonetim");
  redirect(`/yonetim/kurumlar/${kurum.id}?durum=olusturuldu`);
}

export async function kurumGuncelle(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  await superadminGerekli();

  const id = String(formData.get("id") ?? "");
  const ad = String(formData.get("ad") ?? "").trim();
  const il = String(formData.get("il") ?? "").trim();
  const ilce = String(formData.get("ilce") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const aktif = formData.get("aktif") === "on";

  if (ad.length < 2) return { hata: "Kurum adı en az 2 karakter olmalı." };

  const kurum = await prisma.institution.findUnique({ where: { id }, select: { id: true } });
  if (!kurum) return { hata: "Kurum bulunamadı." };

  await prisma.institution.update({
    where: { id },
    data: { ad, il: il || null, ilce: ilce || null, logoUrl: logoUrl || null, aktif },
  });

  revalidatePath("/yonetim");
  revalidatePath(`/yonetim/kurumlar/${id}`);
  return { basari: "Kurum bilgileri güncellendi." };
}

export async function kullaniciOlustur(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  await superadminGerekli();

  const institutionId = String(formData.get("institutionId") ?? "");
  const adSoyad = String(formData.get("adSoyad") ?? "").trim();
  const kullaniciAdi = String(formData.get("kullaniciAdi") ?? "")
    .trim()
    .toLocaleLowerCase("tr");
  const sifre = String(formData.get("sifre") ?? "");

  if (adSoyad.length < 3) return { hata: "Ad soyad en az 3 karakter olmalı." };
  if (!KULLANICI_ADI_DESENI.test(kullaniciAdi)) {
    return {
      hata: "Kullanıcı adı 3-32 karakter olmalı; küçük harf, rakam, nokta, tire ve alt çizgi kullanılabilir.",
    };
  }
  if (sifre.length < EN_KISA_SIFRE) {
    return { hata: `Şifre en az ${EN_KISA_SIFRE} karakter olmalı.` };
  }

  const kurum = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true },
  });
  if (!kurum) return { hata: "Kurum bulunamadı." };

  const mevcut = await prisma.user.findUnique({ where: { kullaniciAdi } });
  if (mevcut) return { hata: `"${kullaniciAdi}" kullanıcı adı zaten kayıtlı.` };

  await prisma.user.create({
    data: {
      kullaniciAdi,
      adSoyad,
      sifreHash: await sifreHashle(sifre),
      rol: ROLLER.KURUM_YETKILISI,
      institutionId,
    },
  });

  revalidatePath(`/yonetim/kurumlar/${institutionId}`);
  return {
    basari: `${kullaniciAdi} hesabı oluşturuldu. Kullanıcı adını ve şifreyi kurum yetkilisine iletin.`,
  };
}

export async function sifreSifirla(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  await superadminGerekli();

  const userId = String(formData.get("userId") ?? "");
  const sifre = String(formData.get("sifre") ?? "");

  if (sifre.length < EN_KISA_SIFRE) {
    return { hata: `Şifre en az ${EN_KISA_SIFRE} karakter olmalı.` };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, kullaniciAdi: true, institutionId: true },
  });
  if (!user) return { hata: "Kullanıcı bulunamadı." };

  await prisma.user.update({
    where: { id: userId },
    data: { sifreHash: await sifreHashle(sifre) },
  });

  if (user.institutionId) revalidatePath(`/yonetim/kurumlar/${user.institutionId}`);
  return { basari: `${user.kullaniciAdi} için yeni şifre tanımlandı.` };
}

/** Kullaniciyi aktif/pasif yapar; hesap silmek yerine erisimi kapatiyoruz. */
export async function kullaniciDurumDegistir(formData: FormData): Promise<void> {
  await superadminGerekli();

  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, aktif: true, institutionId: true, rol: true },
  });
  if (!user || user.rol === ROLLER.SUPERADMIN) redirect("/yonetim");

  await prisma.user.update({ where: { id: userId }, data: { aktif: !user.aktif } });

  if (user.institutionId) revalidatePath(`/yonetim/kurumlar/${user.institutionId}`);
}
