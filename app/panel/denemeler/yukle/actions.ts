"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { varsayilanDenemeAdi } from "@/lib/import/eslestir";
import { denemeyiKaydet } from "@/lib/import/kaydet";
import { asamaKaydet, asamaOku, asamaSil } from "@/lib/import/staging";
import { DesteklenmeyenFormatHatasi } from "@/lib/pdf/detect";
import { parseExamPdf, ProfilOgrenmeHatasi } from "@/lib/pdf/parseExamPdf";

const MAKS_BOYUT = 25 * 1024 * 1024;

export interface YuklemeDurumu {
  hata?: string;
}

export async function pdfYukle(
  _oncekiDurum: YuklemeDurumu,
  formData: FormData,
): Promise<YuklemeDurumu> {
  const { oturum, kurum } = await kurumOturumuGerekli();

  const dosya = formData.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return { hata: "Lütfen bir PDF dosyası seçin." };
  }
  if (dosya.size > MAKS_BOYUT) {
    return { hata: "Dosya 25 MB sınırını aşıyor. Denemeyi bölerek yükleyebilirsiniz." };
  }
  if (!dosya.name.toLowerCase().endsWith(".pdf")) {
    return { hata: "Yalnızca PDF dosyası yükleyebilirsiniz." };
  }

  let token: string;
  try {
    const data = new Uint8Array(await dosya.arrayBuffer());
    const parsed = await parseExamPdf(data, dosya.name);

    if (parsed.ogrenciler.length === 0) {
      return {
        hata: "PDF içinde öğrenci sonucu bulunamadı. Dosyanın sonuç belgesi olduğundan emin olun.",
      };
    }

    token = await asamaKaydet({
      institutionId: kurum.id,
      yukleyenId: oturum.userId,
      dosyaAdi: dosya.name,
      parsed,
    });
  } catch (error) {
    if (error instanceof ProfilOgrenmeHatasi) {
      console.warn(`Sablon ogrenilemedi: ${dosya.name} (${error.message})`);
      return { hata: error.message };
    }
    if (error instanceof DesteklenmeyenFormatHatasi) {
      console.warn(`Desteklenmeyen format yuklendi: ${dosya.name} (kurum: ${kurum.slug})`);
      return {
        hata:
          "Bu yayının sonuç belgesi formatı henüz desteklenmiyor. Dosyayı Hedefly ekibine iletirseniz kısa sürede ekleyebiliriz.",
      };
    }
    console.error("PDF ayristirma hatasi:", error);
    return { hata: "PDF okunurken bir sorun oluştu. Dosya bozuk olabilir." };
  }

  redirect(`/panel/denemeler/yukle/${token}`);
}

export interface OnayDurumu {
  hata?: string;
}

export async function denemeOnayla(
  _oncekiDurum: OnayDurumu,
  formData: FormData,
): Promise<OnayDurumu> {
  const { oturum, kurum } = await kurumOturumuGerekli();

  const token = String(formData.get("token") ?? "");
  const denemeAdi = String(formData.get("denemeAdi") ?? "").trim();
  const tarihMetni = String(formData.get("tarih") ?? "").trim();
  const sinavTuru = String(formData.get("sinavTuru") ?? "TYT").trim() || "TYT";

  if (!denemeAdi) return { hata: "Deneme adı gerekli." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarihMetni)) return { hata: "Geçerli bir tarih seçin." };

  const tarih = new Date(`${tarihMetni}T00:00:00.000Z`);
  if (Number.isNaN(tarih.getTime())) return { hata: "Geçerli bir tarih seçin." };

  const asama = await asamaOku(token, kurum.id);
  if (!asama) {
    return { hata: "Yükleme süresi dolmuş görünüyor. Lütfen PDF'i yeniden yükleyin." };
  }

  let examId: string;
  try {
    const sonuc = await denemeyiKaydet({
      institutionId: kurum.id,
      yukleyenId: oturum.userId,
      parsed: asama.parsed,
      denemeAdi,
      tarih,
      sinavTuru,
      kaynakDosya: asama.dosyaAdi,
    });
    examId = sonuc.examId;
  } catch (error) {
    console.error("Deneme kaydetme hatasi:", error);
    return { hata: "Sonuçlar kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin." };
  }

  await asamaSil(token);
  revalidatePath("/panel");
  revalidatePath("/panel/denemeler");
  revalidatePath("/panel/ogrenciler");

  redirect(`/panel/denemeler/${examId}?durum=kaydedildi`);
}

export async function yuklemeIptal(formData: FormData): Promise<void> {
  const { kurum } = await kurumOturumuGerekli();
  const token = String(formData.get("token") ?? "");
  const asama = await asamaOku(token, kurum.id);
  if (asama) await asamaSil(token);
  redirect("/panel/denemeler");
}
