// Edge (middleware) tarafinda da calisabilmesi icin bu dosya yalnizca imza
// islerini icerir; cookie erisimi lib/auth/session.ts icinde.
// jose'un alt yollari kullaniliyor: kok import, kullanmadigimiz JWE kodunu da
// bundle'a katip Edge uyarilari uretiyor.
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { ROLLER, type Rol } from "./roller";

export const OTURUM_COOKIE = "denemely_oturum";
const OTURUM_SURESI_GUN = 7;
export const OTURUM_SURESI_SANIYE = OTURUM_SURESI_GUN * 24 * 60 * 60;

export interface Oturum {
  userId: string;
  kullaniciAdi: string;
  adSoyad: string;
  rol: Rol;
  institutionId: string | null;
  institutionSlug: string | null;
}

function gizliAnahtar(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET tanimli degil. .env dosyasina en az 32 karakterlik bir deger ekleyin.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function oturumTokeniUret(oturum: Oturum): Promise<string> {
  return new SignJWT({ ...oturum })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OTURUM_SURESI_GUN}d`)
    .sign(gizliAnahtar());
}

export async function oturumTokeniDogrula(token: string): Promise<Oturum | null> {
  try {
    const { payload } = await jwtVerify(token, gizliAnahtar(), { clockTolerance: 60 });
    const rol = payload.rol;
    if (rol !== ROLLER.SUPERADMIN && rol !== ROLLER.KURUM_YETKILISI) return null;

    return {
      userId: String(payload.userId),
      kullaniciAdi: String(payload.kullaniciAdi),
      adSoyad: String(payload.adSoyad),
      rol,
      institutionId: payload.institutionId ? String(payload.institutionId) : null,
      institutionSlug: payload.institutionSlug ? String(payload.institutionSlug) : null,
    };
  } catch {
    // Suresi gecmis veya imzasi bozuk token
    return null;
  }
}
