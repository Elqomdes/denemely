"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { parseSinavTuru } from "@/lib/sinav";

/**
 * Yanlis yuklenen bir denemeyi siler. Sonuclar, ders/kazanim/cevap kayitlari
 * cascade ile birlikte silinir; ogrenci kayitlari korunur.
 */
export async function denemeSil(formData: FormData): Promise<void> {
  const { kurum } = await kurumOturumuGerekli();
  const examId = String(formData.get("examId") ?? "");

  const deneme = await prisma.exam.findFirst({
    where: { id: examId, institutionId: kurum.id },
    select: { id: true, sinavTuru: true },
  });
  if (!deneme) redirect("/panel/denemeler");

  await prisma.exam.delete({ where: { id: deneme.id } });

  revalidatePath("/panel");
  revalidatePath("/panel/denemeler");
  revalidatePath("/panel/ogrenciler");
  redirect(`/panel/denemeler?durum=silindi&sinav=${parseSinavTuru(deneme.sinavTuru)}`);
}
