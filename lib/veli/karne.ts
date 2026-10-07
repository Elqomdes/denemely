import { randomBytes } from "node:crypto";
import { grupSiraNo } from "@/lib/analiz";
import { prisma } from "@/lib/db";
import { dersSiraNo, kanonikDersAdi, tekDenemeDersleri } from "@/lib/ders/kanonik";
import { resolveDersGrubu } from "@/lib/pdf/parseUtils";

export async function veliKarnesiOlustur(kurumId: string, studentId: string, examId: string) {
  const sonuc = await prisma.examResult.findFirst({
    where: {
      studentId,
      examId,
      student: { institutionId: kurumId },
      exam: { institutionId: kurumId },
    },
    select: { id: true },
  });
  if (!sonuc) return null;

  const mevcut = await prisma.veliKarne.findUnique({
    where: { studentId_examId: { studentId, examId } },
    select: { token: true },
  });
  if (mevcut) return mevcut.token;

  const kayit = await prisma.veliKarne.create({
    data: {
      token: randomBytes(24).toString("base64url"),
      institutionId: kurumId,
      studentId,
      examId,
    },
    select: { token: true },
  });
  return kayit.token;
}

export async function veliKarnesiOku(token: string) {
  const kayit = await prisma.veliKarne.findUnique({
    where: { token },
    select: {
      studentId: true,
      examId: true,
      institutionId: true,
      student: {
        select: { adSoyad: true, sinif: true, ogrenciNo: true, aktif: true, institutionId: true },
      },
      exam: {
        select: {
          ad: true,
          tarih: true,
          sinavTuru: true,
          institutionId: true,
          institution: { select: { ad: true, aktif: true } },
        },
      },
    },
  });

  if (!kayit || !kayit.student.aktif || !kayit.exam.institution.aktif) return null;
  if (
    kayit.student.institutionId !== kayit.institutionId ||
    kayit.exam.institutionId !== kayit.institutionId
  ) {
    return null;
  }

  const sonuc = await prisma.examResult.findUnique({
    where: { examId_studentId: { examId: kayit.examId, studentId: kayit.studentId } },
    select: {
      puan: true,
      yuzdelikDilim: true,
      toplamSoru: true,
      toplamDogru: true,
      toplamYanlis: true,
      toplamBos: true,
      toplamNet: true,
      genelSira: true,
      dersler: {
        select: {
          dersAdi: true,
          dersGrubu: true,
          isGrup: true,
          soru: true,
          dogru: true,
          yanlis: true,
          bos: true,
          net: true,
          basariYuzde: true,
          sinifOrt: true,
          kurumOrt: true,
        },
      },
      kazanimlar: {
        select: {
          dersAdi: true,
          dersGrubu: true,
          kazanim: true,
          soru: true,
          dogru: true,
          yanlis: true,
          basariYuzde: true,
        },
      },
    },
  });
  if (!sonuc) return null;

  const gruplar = sonuc.dersler
    .filter((ders) => ders.isGrup)
    .sort((a, b) => grupSiraNo(a.dersGrubu) - grupSiraNo(b.dersGrubu));
  const dersler = tekDenemeDersleri(sonuc.dersler);

  return {
    kurumAd: kayit.exam.institution.ad,
    ogrenci: kayit.student,
    sinav: { ad: kayit.exam.ad, tarih: kayit.exam.tarih, sinavTuru: kayit.exam.sinavTuru },
    sonuc,
    gruplar,
    dersler,
    kazanimGruplari: kazanimlariDerslereAyir(
      sonuc.kazanimlar.flatMap((satir) => {
        const dersAdi = kanonikDersAdi(satir.dersAdi);
        if (!dersAdi) return [];
        return [{ ...satir, dersAdi, dersGrubu: resolveDersGrubu(dersAdi) }];
      }),
    ),
  };
}

function kazanimlariDerslereAyir<
  T extends {
    dersAdi: string;
    dersGrubu: string;
    kazanim: string;
    soru: number;
    basariYuzde: number | null;
  },
>(satirlar: T[]) {
  const harita = new Map<string, { dersAdi: string; dersGrubu: string; satirlar: T[] }>();
  for (const satir of satirlar) {
    const anahtar = `${satir.dersGrubu}\0${satir.dersAdi}`;
    const mevcut = harita.get(anahtar);
    if (mevcut) mevcut.satirlar.push(satir);
    else harita.set(anahtar, { dersAdi: satir.dersAdi, dersGrubu: satir.dersGrubu, satirlar: [satir] });
  }

  return [...harita.values()]
    .map((grup) => ({
      ...grup,
      satirlar: [...grup.satirlar].sort(
        (a, b) =>
          (a.basariYuzde ?? 0) - (b.basariYuzde ?? 0) ||
          b.soru - a.soru ||
          a.kazanim.localeCompare(b.kazanim, "tr"),
      ),
    }))
    .sort(
      (a, b) =>
        dersSiraNo(a.dersAdi) - dersSiraNo(b.dersAdi) || a.dersAdi.localeCompare(b.dersAdi, "tr"),
    );
}
