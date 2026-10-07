import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma, veritabaniHazir } from "@/lib/db";
import { ROLLER } from "./roller";
import { oturumuOku, type Oturum } from "./session";

/** Oturum yoksa girise gonderir. */
export const oturumGerekli = cache(async (): Promise<Oturum> => {
  const oturum = await oturumuOku();
  if (!oturum) redirect("/giris");
  return oturum;
});

export async function superadminGerekli(): Promise<Oturum> {
  const oturum = await oturumGerekli();
  if (oturum.rol !== ROLLER.SUPERADMIN) redirect("/panel");
  return oturum;
}

export interface KurumOturumu {
  oturum: Oturum;
  kurum: {
    id: string;
    slug: string;
    ad: string;
    il: string | null;
    ilce: string | null;
    logoUrl: string | null;
  };
}

/**
 * Kurum panelindeki her sorgu bu kurum kimligiyle sinirlanir; boylece bir kurum
 * baska kurumun verisine erisemez.
 */
export const kurumOturumuGerekli = cache(async (): Promise<KurumOturumu> => {
  const [oturum] = await Promise.all([oturumGerekli(), veritabaniHazir]);
  if (oturum.rol === ROLLER.SUPERADMIN) redirect("/yonetim");
  if (!oturum.institutionId) redirect("/giris");

  const kurum = await prisma.institution.findUnique({
    where: { id: oturum.institutionId },
    select: { id: true, slug: true, ad: true, il: true, ilce: true, logoUrl: true, aktif: true },
  });

  if (!kurum || !kurum.aktif) redirect("/giris?hata=kurum-pasif");

  return { oturum, kurum };
});
