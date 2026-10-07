import { cookies } from "next/headers";
import {
  OTURUM_COOKIE,
  OTURUM_SURESI_SANIYE,
  oturumTokeniDogrula,
  oturumTokeniUret,
  type Oturum,
} from "./token";

export { OTURUM_COOKIE, oturumTokeniDogrula, oturumTokeniUret, type Oturum };

export async function oturumuBaslat(oturum: Oturum): Promise<void> {
  const token = await oturumTokeniUret(oturum);
  const cookieStore = await cookies();
  cookieStore.set(OTURUM_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.DENEMELY_HTTPS === "1",
    path: "/",
    maxAge: OTURUM_SURESI_SANIYE,
  });
}

export async function oturumuKapat(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(OTURUM_COOKIE);
}

export async function oturumuOku(): Promise<Oturum | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OTURUM_COOKIE)?.value;
  if (!token) return null;
  return oturumTokeniDogrula(token);
}
