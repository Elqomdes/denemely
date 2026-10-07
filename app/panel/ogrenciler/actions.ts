"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import {
  farkliKisilerOlarakIsaretle,
  ogrenciGuncelle as ogrenciGuncelleIslemi,
  ogrencileriBirlestir as ogrencileriBirlestirIslemi,
} from "@/lib/ogrenci/islemler";
import { adSirasiTaraVeBirlestir } from "@/lib/ogrenci/siraTaramasi";
import { veliKarnesiOlustur } from "@/lib/veli/karne";

export interface OgrenciFormDurumu {
  hata?: string;
  basari?: string;
}

export interface TaramaDurumu {
  hata?: string;
  basari?: string;
  satirlar?: string[];
}

function panelYollariniYenile() {
  revalidatePath("/panel");
  revalidatePath("/panel/ogrenciler");
  revalidatePath("/panel/ogrenciler/birlestir");
  revalidatePath("/panel/denemeler");
}

export async function ogrenciGuncelle(
  _oncekiDurum: OgrenciFormDurumu,
  formData: FormData,
): Promise<OgrenciFormDurumu> {
  const { kurum } = await kurumOturumuGerekli();

  const id = String(formData.get("id") ?? "");
  const adSoyad = String(formData.get("adSoyad") ?? "").trim().replace(/\s+/g, " ");
  const sinif = String(formData.get("sinif") ?? "").trim();
  const ogrenciNo = String(formData.get("ogrenciNo") ?? "").trim();

  if (adSoyad.length < 3) return { hata: "Ad soyad en az 3 karakter olmalı." };

  const sonuc = await ogrenciGuncelleIslemi({
    institutionId: kurum.id,
    id,
    adSoyad,
    sinif: sinif || null,
    ogrenciNo: ogrenciNo || null,
  });

  if (sonuc.cakisanId) {
    return {
      hata: "Bu ada sahip başka bir kayıt var. Aynı kişiyse iki kaydı birleştirmelisiniz.",
    };
  }

  panelYollariniYenile();
  revalidatePath(`/panel/ogrenciler/${id}`);
  return { basari: "Öğrenci bilgileri güncellendi." };
}

/**
 * Iki kaydi birlestirir. Ayni ogrenci farkli denemelerde farkli yazildiginda
 * (ornegin ikinci adini kodlamadiginda) olusan kopya kayitlari tekilleştirir.
 */
export async function ogrencileriBirlestir(formData: FormData): Promise<void> {
  const { kurum } = await kurumOturumuGerekli();

  const hedefId = String(formData.get("hedefId") ?? "");
  const kaynakId = String(formData.get("kaynakId") ?? "");
  const korunacakAd = formData.get("korunacakAd") === "kaynak" ? "kaynak" : "hedef";
  const donus = String(formData.get("donus") ?? "/panel/ogrenciler/birlestir");

  if (!hedefId || !kaynakId || hedefId === kaynakId) {
    redirect(`${donus}?durum=hatali-secim`);
  }

  const sonuc = await ogrencileriBirlestirIslemi({
    institutionId: kurum.id,
    hedefId,
    kaynakId,
    korunacakAd,
  });

  panelYollariniYenile();
  revalidatePath(`/panel/ogrenciler/${hedefId}`);

  const hedefYol = donus.startsWith("/panel/ogrenciler/") && donus !== "/panel/ogrenciler/birlestir"
    ? `/panel/ogrenciler/${hedefId}`
    : donus;

  redirect(`${hedefYol}?durum=birlestirildi&tasinan=${sonuc.tasinanSonuc}`);
}

/** Soyad-ad ile ad-soyad şeklinde ayrılmış aynı öğrencileri tarar ve birleştirir. */
export async function adSirasiTara(
  _onceki: TaramaDurumu,
  _formData: FormData,
): Promise<TaramaDurumu> {
  const { kurum } = await kurumOturumuGerekli();

  try {
    const sonuc = await adSirasiTaraVeBirlestir(kurum.id);
    panelYollariniYenile();

    if (sonuc.birlesen.length === 0 && sonuc.atlanan.length === 0) {
      return { basari: "Sıra farkı olan kayıt bulunmadı." };
    }

    const satirlar = [
      ...sonuc.birlesen.map(
        (kayit) => `${kayit.silinen} → ${kayit.korunan} (${kayit.tasinan} deneme taşındı)`,
      ),
      ...sonuc.atlanan.map((kayit) => `${kayit.a} / ${kayit.b}: ${kayit.neden}`),
    ];

    return {
      basari:
        sonuc.birlesen.length > 0
          ? `${sonuc.birlesen.length} kayıt birleştirildi.`
          : "Birleştirilecek güvenli eşleşme kalmadı.",
      satirlar,
    };
  } catch (error) {
    const mesaj = error instanceof Error ? error.message : "Tarama tamamlanamadı.";
    return { hata: mesaj };
  }
}

/** Oneriyi kalici olarak reddeder: "bu ikisi ayni kisi degil". */
export async function farkliKisiler(formData: FormData): Promise<void> {
  const { kurum } = await kurumOturumuGerekli();

  const hedefId = String(formData.get("hedefId") ?? "");
  const kaynakId = String(formData.get("kaynakId") ?? "");
  if (!hedefId || !kaynakId) redirect("/panel/ogrenciler/birlestir");

  await farkliKisilerOlarakIsaretle(kurum.id, hedefId, kaynakId);

  revalidatePath("/panel/ogrenciler/birlestir");
  redirect("/panel/ogrenciler/birlestir?durum=yoksayildi");
}

/** Secilen deneme icin yalnizca bu ogrenciyi gosteren veli baglantisi uretir. */
export async function veliKarnesiHazirla(
  studentId: string,
  examId: string,
): Promise<{ yol: string } | { hata: string }> {
  const { kurum } = await kurumOturumuGerekli();
  const token = await veliKarnesiOlustur(kurum.id, studentId, examId);
  if (!token) return { hata: "Bu öğrencinin seçilen denemede sonucu yok." };
  return { yol: `/v/${token}` };
}
