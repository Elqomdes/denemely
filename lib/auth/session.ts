import { cookies } from "next/headers";
import {
  OTURUM_COOKIE,
  OTURUM_SURESI_SANIYE,
  oturumTokeniDogrula,
  oturumTokeniUret,
  type Oturum,
} from "./token";

export { OTURUM_COOKIE, oturumTokeniDogrula, oturumTokeniUret, type Oturum };

function cerezAyarlari(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // Vercel HTTPS; yerel next start HTTP kalir.
    secure: process.env.DENEMELY_HTTPS === "1" || process.env.VERCEL === "1",
    path: "/",
    maxAge,
  };
}

export async function oturumuBaslat(oturum: Oturum): Promise<void> {
  const token = await oturumTokeniUret(oturum);
  const cookieStore = await cookies();
  cookieStore.set(OTURUM_COOKIE, token, cerezAyarlari(OTURUM_SURESI_SANIYE));
}

export async function oturumuKapat(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OTURUM_COOKIE, "", cerezAyarlari(0));
}

export async function oturumuOku(): Promise<Oturum | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OTURUM_COOKIE)?.value;
  if (!token) return null;
  return oturumTokeniDogrula(token);
}
