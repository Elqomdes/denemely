import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { compare } from "bcryptjs";

const scrypt = promisify(scryptCb);
const ONEK = "scrypt$";

/** Eski kayitlar bcrypt. Yeni kayitlar Node scrypt; giris bcrypt'ten belirgin hizli. */
export function hizliHashMi(kayit: string): boolean {
  return kayit.startsWith(ONEK);
}

export async function sifreHashle(sifre: string): Promise<string> {
  const tuz = randomBytes(16).toString("base64url");
  const anahtar = (await scrypt(sifre, tuz, 32)) as Buffer;
  return `${ONEK}${tuz}$${anahtar.toString("base64url")}`;
}

export async function sifreDogruMu(sifre: string, kayit: string): Promise<boolean> {
  if (!hizliHashMi(kayit)) return compare(sifre, kayit);

  const [, tuz, beklenen] = kayit.split("$");
  if (!tuz || !beklenen) return false;

  const anahtar = (await scrypt(sifre, tuz, 32)) as Buffer;
  const hedef = Buffer.from(beklenen, "base64url");
  if (anahtar.length !== hedef.length) return false;
  return timingSafeEqual(anahtar, hedef);
}
