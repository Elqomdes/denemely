import { PrismaClient } from "@prisma/client";

// Gelistirme sirasinda hot reload her seferinde yeni baglanti acmasin.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  veritabaniHazir?: Promise<void>;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

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
