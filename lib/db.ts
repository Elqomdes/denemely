import { PrismaClient } from "@prisma/client";

// Gelistirme sirasinda hot reload her seferinde yeni baglanti acmasin.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  veritabaniHazir?: Promise<void>;
};

function baglantiVarMi(): boolean {
  const url = process.env.DENEMELY_DATABASE_URL?.trim() ?? "";
  return (
    url.startsWith("postgresql://") ||
    url.startsWith("postgres://") ||
    url.startsWith("file:")
  );
}

function prismaIstemcisi(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (!baglantiVarMi()) {
    throw new Error(
      "DENEMELY_DATABASE_URL eksik. Vercel'e postgresql:// ile baslayan Supabase pooler adresini ekleyin.",
    );
  }
  const istemci = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  globalForPrisma.prisma = istemci;
  return istemci;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_hedef, ozellik) {
    // PrismaClient thenable; Next bu nesneyi await etmesin.
    if (ozellik === "then") return undefined;
    const istemci = prismaIstemcisi() as unknown as Record<PropertyKey, unknown>;
    const deger = Reflect.get(istemci, ozellik, istemci);
    return typeof deger === "function" ? (deger as (...args: never[]) => unknown).bind(istemci) : deger;
  },
});

const sqliteMi = (process.env.DENEMELY_DATABASE_URL ?? "").startsWith("file:");

/** SQLite okumalarini kilit beklemeden yapar. Postgres'te bir sey yapmaz. */
export const veritabaniHazir =
  globalForPrisma.veritabaniHazir ??
  (sqliteMi
    ? prisma
        .$queryRawUnsafe("PRAGMA journal_mode=WAL")
        .then(() => prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL"))
        .then(() => prisma.$queryRawUnsafe("PRAGMA cache_size=-16000"))
        .then(() => undefined)
    : Promise.resolve());

globalForPrisma.veritabaniHazir = veritabaniHazir;
