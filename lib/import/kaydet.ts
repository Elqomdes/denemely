import { kanonikDersAdi } from "@/lib/ders/kanonik";
import { prisma } from "@/lib/db";
import { resolveDersGrubu } from "@/lib/pdf/parseUtils";
import { ogrenciCozumleVeyaOlustur } from "@/lib/ogrenci/eslestirme";
import type { ParsedExamFile } from "@/lib/pdf/types";

export interface KayitSonucu {
  examId: string;
  eklenenOgrenci: number;
  kaydedilenSonuc: number;
}

export interface KayitGirdisi {
  institutionId: string;
  yukleyenId: string;
  parsed: ParsedExamFile;
  denemeAdi: string;
  tarih: Date;
  sinavTuru: string;
  kaynakDosya: string;
}

/**
 * Ayristirilan denemeyi veritabanina yazar.
 * Ayni deneme (kurum + ad + tarih) tekrar yuklenirse mevcut kayit guncellenir,
 * ogrencinin onceki sonucu silinip yenisi yazilir. Boylece tekrar yukleme
 * kopya olusturmaz.
 */
export async function denemeyiKaydet(girdi: KayitGirdisi): Promise<KayitSonucu> {
  const { institutionId, yukleyenId, parsed, denemeAdi, tarih, sinavTuru, kaynakDosya } = girdi;

  const toplamSoru = parsed.ogrenciler[0]?.toplam.soru ?? 0;

  const format = parsed.profilId
    ? `PROFIL:${parsed.profilAdi ?? parsed.profilId}`
    : parsed.format;

  const exam = await prisma.exam.upsert({
    where: { institutionId_ad_tarih: { institutionId, ad: denemeAdi, tarih } },
    update: { format, sinavTuru, kaynakDosya, toplamSoru, yukleyenId },
    create: {
      institutionId,
      ad: denemeAdi,
      sinavTuru,
      format,
      tarih,
      kaynakDosya,
      toplamSoru,
      yukleyenId,
    },
  });

  let eklenenOgrenci = 0;
  let kaydedilenSonuc = 0;

  for (const ogrenci of parsed.ogrenciler) {
    // Kayitli ad veya daha once birlestirilmis bir yazim (takma ad) uzerinden eslesir.
    const cozumleme = await ogrenciCozumleVeyaOlustur({
      institutionId,
      adSoyad: ogrenci.ogrenciAdi,
      sinif: ogrenci.sinif,
      ogrenciNo: ogrenci.ogrenciNo,
    });
    if (cozumleme.yeniMi) eklenenOgrenci += 1;
    const student = { id: cozumleme.studentId };

    await prisma.$transaction(async (tx) => {
      // Tekrar yuklemede eski alt kayitlar cascade ile silinsin diye sonucu
      // komple yeniden olusturuyoruz.
      await tx.examResult.deleteMany({ where: { examId: exam.id, studentId: student.id } });

      const sonuc = await tx.examResult.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          sayfaNo: ogrenci.pageNumber,
          puan: ogrenci.puan,
          genelOrtalamaPuan: ogrenci.genelOrtalamaPuan,
          yuzdelikDilim: ogrenci.yuzdelikDilim,
          toplamSoru: ogrenci.toplam.soru,
          toplamDogru: ogrenci.toplam.dogru,
          toplamYanlis: ogrenci.toplam.yanlis,
          toplamBos: ogrenci.toplam.bos,
          toplamNet: ogrenci.toplam.net,
          basariYuzde: ogrenci.toplam.basariYuzde,
          sinifSira: ogrenci.siralar.sinif,
          kurumSira: ogrenci.siralar.kurum,
          ilceSira: ogrenci.siralar.ilce,
          ilSira: ogrenci.siralar.il,
          genelSira: ogrenci.siralar.genel,
          sinifKatilim: ogrenci.katilimlar.sinif,
          kurumKatilim: ogrenci.katilimlar.kurum,
          ilceKatilim: ogrenci.katilimlar.ilce,
          ilKatilim: ogrenci.katilimlar.il,
          genelKatilim: ogrenci.katilimlar.genel,
          uyarilar: ogrenci.uyarilar.length > 0 ? JSON.stringify(ogrenci.uyarilar) : null,
        },
        select: { id: true },
      });

      const dersKayitlari = ogrenci.dersler.flatMap((ders) => {
        const dersAdi = ders.isGrup ? ders.dersAdi : kanonikDersAdi(ders.dersAdi);
        if (!dersAdi) return [];
        return [
          {
            examResultId: sonuc.id,
            dersAdi,
            dersGrubu: ders.isGrup ? ders.dersGrubu : resolveDersGrubu(dersAdi),
            isGrup: ders.isGrup,
            soru: ders.soru,
            dogru: ders.dogru,
            yanlis: ders.yanlis,
            bos: ders.bos,
            net: ders.net,
            basariYuzde: ders.basariYuzde,
            sinifOrt: ders.sinifOrt,
            kurumOrt: ders.kurumOrt,
            genelOrt: ders.genelOrt,
          },
        ];
      });
      if (dersKayitlari.length > 0) {
        await tx.subjectResult.createMany({ data: dersKayitlari });
      }

      const kazanimKayitlari = ogrenci.kazanimlar.flatMap((kazanim) => {
        const dersAdi = kanonikDersAdi(kazanim.dersAdi);
        if (!dersAdi) return [];
        return [
          {
            examResultId: sonuc.id,
            dersAdi,
            dersGrubu: resolveDersGrubu(dersAdi),
            kazanim: kazanim.kazanim,
            soru: kazanim.soru,
            dogru: kazanim.dogru,
            yanlis: kazanim.yanlis,
            basariYuzde: kazanim.basariYuzde,
          },
        ];
      });
      if (kazanimKayitlari.length > 0) {
        await tx.topicResult.createMany({ data: kazanimKayitlari });
      }

      if (ogrenci.cevaplar.length > 0) {
        await tx.answerSheet.createMany({
          data: ogrenci.cevaplar.map((cevap) => ({
            examResultId: sonuc.id,
            dersGrubu: cevap.dersGrubu,
            kitapcik: cevap.kitapcik,
            cevapAnahtari: cevap.cevapAnahtari,
            ogrenciCevaplari: cevap.ogrenciCevaplari,
          })),
        });
      }
    });

    kaydedilenSonuc += 1;
  }

  return { examId: exam.id, eklenenOgrenci, kaydedilenSonuc };
}
