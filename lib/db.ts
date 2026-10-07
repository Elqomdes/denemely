import { PrismaClient } from "@prisma/client";

if (!process.env.DENEMELY_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.DENEMELY_DATABASE_URL = process.env.DATABASE_URL;
}

// Gelistirme sirasinda hot reload her seferinde yeni baglanti acmasin.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  veritabaniHazir?: Promise<void>;
};

function baglantiVarMi(): boolean {
  const url = process.env.DENEMELY_DATABASE_URL?.trim() ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
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

export const veritabaniHazir =
  globalForPrisma.veritabaniHazir ?? Promise.resolve();

globalForPrisma.veritabaniHazir = veritabaniHazir;
