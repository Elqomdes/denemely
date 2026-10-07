import { cache } from "react";
import { dersSiraNo, kanonikDersAdi, tekDenemeDersleri } from "@/lib/ders/kanonik";
import { prisma } from "@/lib/db";
import { resolveDersGrubu } from "@/lib/pdf/parseUtils";

export const GRUP_SIRASI = ["TYT Türkçe", "TYT Sosyal", "TYT Matematik", "TYT Fen"];

/** Ders gruplarini karnedeki sirayla gostermek icin */
export function grupSiraNo(grup: string): number {
  const index = GRUP_SIRASI.indexOf(grup);
  return index === -1 ? 99 : index;
}

export const GRUP_KISA_ADLARI: Record<string, string> = {
  "TYT Türkçe": "Türkçe",
  "TYT Sosyal": "Sosyal",
  "TYT Matematik": "Matematik",
  "TYT Fen": "Fen",
};

export function grupKisaAdi(grup: string): string {
  return GRUP_KISA_ADLARI[grup] ?? grup;
}

export interface KazanimOzeti {
  kazanim: string;
  dersAdi: string;
  dersGrubu: string;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  basariYuzde: number;
}

function kazanimOzetiHazirla(
  satirlar: Array<{
    kazanim: string;
    dersAdi: string;
    dersGrubu: string;
    _sum: { soru: number | null; dogru: number | null; yanlis: number | null };
  }>,
): KazanimOzeti[] {
  return satirlar.map((satir) => {
    const soru = satir._sum.soru ?? 0;
    const dogru = satir._sum.dogru ?? 0;
    const yanlis = satir._sum.yanlis ?? 0;
    return {
      kazanim: satir.kazanim,
      dersAdi: satir.dersAdi,
      dersGrubu: satir.dersGrubu,
      soru,
      dogru,
      yanlis,
      bos: Math.max(0, soru - dogru - yanlis),
      basariYuzde: soru > 0 ? (dogru / soru) * 100 : 0,
    };
  });
}

/** Kurum genel bakis verileri */
export const kurumOzeti = cache(async (institutionId: string) => {
  const [denemeSayisi, ogrenciSayisi, denemeler] = await Promise.all([
    prisma.exam.count({ where: { institutionId } }),
    prisma.student.count({ where: { institutionId, aktif: true } }),
    prisma.exam.findMany({
      where: { institutionId },
      orderBy: { tarih: "desc" },
      take: 10,
      select: {
        id: true,
        ad: true,
        tarih: true,
        toplamSoru: true,
        _count: { select: { sonuclar: true } },
      },
    }),
  ]);

  const denemeIdleri = denemeler.map((deneme) => deneme.id);

  const ortalamalar =
    denemeIdleri.length > 0
      ? await prisma.examResult.groupBy({
          by: ["examId"],
          where: { examId: { in: denemeIdleri } },
          _avg: { toplamNet: true, puan: true },
          _max: { toplamNet: true },
        })
      : [];

  const ortalamaHaritasi = new Map(ortalamalar.map((o) => [o.examId, o]));

  // Grafik icin eskiden yeniye
  const trend = [...denemeler].reverse().map((deneme) => {
    const ortalama = ortalamaHaritasi.get(deneme.id);
    return {
      examId: deneme.id,
      ad: deneme.ad,
      tarih: deneme.tarih,
      katilim: deneme._count.sonuclar,
      ortalamaNet: ortalama?._avg.toplamNet ?? null,
      ortalamaPuan: ortalama?._avg.puan ?? null,
      enYuksekNet: ortalama?._max.toplamNet ?? null,
    };
  });

  const sonDeneme = denemeler[0] ?? null;

  const [sonDenemeGruplari, zayifKazanimlar] = sonDeneme
    ? await Promise.all([
        prisma.subjectResult.groupBy({
          by: ["dersGrubu"],
          where: { isGrup: true, examResult: { examId: sonDeneme.id } },
          _avg: { net: true, basariYuzde: true },
          _count: { _all: true },
        }),
        enZayifKazanimlar({ examId: sonDeneme.id }),
      ])
    : [[], []];

  return {
    denemeSayisi,
    ogrenciSayisi,
    trend,
    sonDeneme: sonDeneme
      ? {
          id: sonDeneme.id,
          ad: sonDeneme.ad,
          tarih: sonDeneme.tarih,
          katilim: sonDeneme._count.sonuclar,
          ortalamaNet: ortalamaHaritasi.get(sonDeneme.id)?._avg.toplamNet ?? null,
          ortalamaPuan: ortalamaHaritasi.get(sonDeneme.id)?._avg.puan ?? null,
          gruplar: sonDenemeGruplari
            .map((grup) => ({
              dersGrubu: grup.dersGrubu,
              ortalamaNet: grup._avg.net,
              ortalamaBasari: grup._avg.basariYuzde,
              ogrenciSayisi: grup._count._all,
            }))
            .sort((a, b) => grupSiraNo(a.dersGrubu) - grupSiraNo(b.dersGrubu)),
        }
      : null,
    zayifKazanimlar,
  };
});

/**
 * En dusuk basarili kazanimlar. Tek soruluk kazanimlarin listeyi doldurmasini
 * onlemek icin en az `enAzSoru` soru cozulmus kazanimlar dikkate alinir.
 */
export const enZayifKazanimlar = cache(async ({
  examId,
  studentId,
  institutionId,
  enAzSoru = 5,
  adet = 10,
}: {
  examId?: string;
  studentId?: string;
  institutionId?: string;
  enAzSoru?: number;
  adet?: number;
}): Promise<KazanimOzeti[]> => {
  const satirlar = await prisma.topicResult.groupBy({
    by: ["kazanim", "dersAdi", "dersGrubu"],
    where: {
      examResult: {
        ...(examId ? { examId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(institutionId ? { exam: { institutionId } } : {}),
      },
    },
    _sum: { soru: true, dogru: true, yanlis: true },
  });

  const birlesik = new Map<string, (typeof satirlar)[number]>();
  for (const satir of satirlar) {
    const dersAdi = kanonikDersAdi(satir.dersAdi);
    if (!dersAdi) continue;
    const dersGrubu = resolveDersGrubu(dersAdi);
    const anahtar = `${dersGrubu}\0${dersAdi}\0${satir.kazanim.trim().toLocaleLowerCase("tr")}`;
    const mevcut = birlesik.get(anahtar);
    if (!mevcut) {
      birlesik.set(anahtar, {
        ...satir,
        dersAdi,
        dersGrubu,
        _sum: { ...satir._sum },
      });
      continue;
    }
    mevcut._sum.soru = (mevcut._sum.soru ?? 0) + (satir._sum.soru ?? 0);
    mevcut._sum.dogru = (mevcut._sum.dogru ?? 0) + (satir._sum.dogru ?? 0);
    mevcut._sum.yanlis = (mevcut._sum.yanlis ?? 0) + (satir._sum.yanlis ?? 0);
  }

  return kazanimOzetiHazirla([...birlesik.values()])
    .filter((kazanim) => kazanim.soru >= enAzSoru)
    .sort((a, b) => a.basariYuzde - b.basariYuzde || b.soru - a.soru || dersSiraNo(a.dersAdi) - dersSiraNo(b.dersAdi))
    .slice(0, adet);
});

/** Kurumun tum denemeleri, katilim ve ortalamalariyla */
export const denemeListesi = cache(async (institutionId: string) => {
  const denemeler = await prisma.exam.findMany({
    where: { institutionId },
    orderBy: { tarih: "desc" },
    select: {
      id: true,
      ad: true,
      tarih: true,
      sinavTuru: true,
      format: true,
      toplamSoru: true,
      createdAt: true,
      _count: { select: { sonuclar: true } },
    },
  });

  if (denemeler.length === 0) return [];

  const ortalamalar = await prisma.examResult.groupBy({
    by: ["examId"],
    where: { examId: { in: denemeler.map((deneme) => deneme.id) } },
    _avg: { toplamNet: true, puan: true },
    _max: { toplamNet: true },
  });
  const harita = new Map(ortalamalar.map((o) => [o.examId, o]));

  return denemeler.map((deneme) => ({
    ...deneme,
    katilim: deneme._count.sonuclar,
    ortalamaNet: harita.get(deneme.id)?._avg.toplamNet ?? null,
    ortalamaPuan: harita.get(deneme.id)?._avg.puan ?? null,
    enYuksekNet: harita.get(deneme.id)?._max.toplamNet ?? null,
  }));
});

/** Bir denemenin detayi: ogrenci siralamasi ve ders grubu ortalamalari */
export const denemeDetayi = cache(async (examId: string, institutionId: string) => {
  const deneme = await prisma.exam.findFirst({
    where: { id: examId, institutionId },
    select: {
      id: true,
      ad: true,
      tarih: true,
      sinavTuru: true,
      format: true,
      toplamSoru: true,
      kaynakDosya: true,
      createdAt: true,
      yukleyen: { select: { adSoyad: true } },
    },
  });
  if (!deneme) return null;

  const sonuclar = await prisma.examResult.findMany({
    where: { examId },
    orderBy: { toplamNet: "desc" },
    select: {
      id: true,
      puan: true,
      yuzdelikDilim: true,
      toplamNet: true,
      toplamDogru: true,
      toplamYanlis: true,
      toplamBos: true,
      basariYuzde: true,
      sinifSira: true,
      kurumSira: true,
      genelSira: true,
      genelKatilim: true,
      student: { select: { id: true, adSoyad: true, sinif: true } },
      dersler: {
        where: { isGrup: true },
        select: { dersGrubu: true, net: true, basariYuzde: true },
      },
    },
  });

  const gruplar = await prisma.subjectResult.groupBy({
    by: ["dersGrubu"],
    where: { isGrup: true, examResult: { examId } },
    _avg: { net: true, basariYuzde: true },
    _max: { net: true },
    _min: { net: true },
    _count: { _all: true },
  });

  const hamDersler = await prisma.subjectResult.findMany({
    where: { examResult: { examId } },
    select: {
      examResultId: true,
      dersAdi: true,
      dersGrubu: true,
      isGrup: true,
      soru: true,
      dogru: true,
      yanlis: true,
      bos: true,
      net: true,
    },
  });

  const zayifKazanimlar = await enZayifKazanimlar({ examId });

  return {
    deneme,
    sonuclar,
    gruplar: gruplar
      .map((grup) => ({
        dersGrubu: grup.dersGrubu,
        ortalamaNet: grup._avg.net,
        ortalamaBasari: grup._avg.basariYuzde,
        enYuksekNet: grup._max.net,
        enDusukNet: grup._min.net,
        ogrenciSayisi: grup._count._all,
      }))
      .sort((a, b) => grupSiraNo(a.dersGrubu) - grupSiraNo(b.dersGrubu)),
    dersler: denemeDersOrtalamalari(hamDersler),
    zayifKazanimlar,
  };
});

function denemeDersOrtalamalari(
  satirlar: Array<{
    examResultId: string;
    dersAdi: string;
    dersGrubu: string;
    isGrup: boolean;
    soru: number;
    dogru: number;
    yanlis: number;
    bos: number;
    net: number;
  }>,
) {
  const ogrenciler = new Map<string, typeof satirlar>();
  for (const satir of satirlar) {
    const liste = ogrenciler.get(satir.examResultId) ?? [];
    liste.push(satir);
    ogrenciler.set(satir.examResultId, liste);
  }

  const toplam = new Map<
    string,
    { dersAdi: string; dersGrubu: string; net: number; basariPay: number; soru: number; adet: number }
  >();
  for (const liste of ogrenciler.values()) {
    for (const ders of tekDenemeDersleri(liste)) {
      const mevcut = toplam.get(ders.dersAdi) ?? {
        dersAdi: ders.dersAdi,
        dersGrubu: ders.dersGrubu,
        net: 0,
        basariPay: 0,
        soru: 0,
        adet: 0,
      };
      mevcut.net += ders.net;
      mevcut.basariPay += (ders.basariYuzde ?? 0) * ders.soru;
      mevcut.soru += ders.soru;
      mevcut.adet += 1;
      toplam.set(ders.dersAdi, mevcut);
    }
  }

  return [...toplam.values()]
    .map((ders) => ({
      dersAdi: ders.dersAdi,
      dersGrubu: ders.dersGrubu,
      ortalamaNet: ders.adet > 0 ? ders.net / ders.adet : null,
      ortalamaBasari: ders.soru > 0 ? ders.basariPay / ders.soru : null,
      soru: ders.adet > 0 ? ders.soru / ders.adet : null,
      ogrenciSayisi: ders.adet,
    }))
    .sort(
      (a, b) =>
        grupSiraNo(a.dersGrubu) - grupSiraNo(b.dersGrubu) || dersSiraNo(a.dersAdi) - dersSiraNo(b.dersAdi),
    );
}

export const SECENEKLER = ["A", "B", "C", "D", "E"] as const;

export interface SoruAnalizi {
  soruNo: number;
  dogruCevap: string;
  dogru: number;
  yanlis: number;
  bos: number;
  toplam: number;
  basariYuzde: number;
  /** Her secenegin kac ogrenci tarafindan isaretlendigi */
  secenekDagilimi: Record<string, number>;
  /** En cok isaretlenen yanlis secenek */
  enCokCeldirici: { secenek: string; adet: number } | null;
}

export interface SoruAnaliziGrubu {
  dersGrubu: string;
  kitapcik: string | null;
  ogrenciSayisi: number;
  sorular: SoruAnalizi[];
}

export interface ZorSoru extends SoruAnalizi {
  dersGrubu: string;
  kitapcik: string | null;
}

/**
 * Soru ve celdirici analizi.
 *
 * Cevap dizilerinde ogrencinin isaretledigi harf duruyor (buyuk harf dogru,
 * kucuk harf yanlis, bosluk bos). Bu sayede her soru icin yalnizca dogru/yanlis
 * sayisi degil, yanlis yapanlarin hangi secenege gittigi de cikarilabiliyor.
 *
 * Onemli: ayni denemede farkli kitapciklar dagitildiginda soru siralamasi
 * degisir. Bu yuzden gruplandirma (ders grubu + cevap anahtari) ikilisine gore
 * yapiliyor; ayni anahtar = ayni soru sirasi.
 */
export const soruAnalizi = cache(async (examId: string, institutionId: string) => {
  const deneme = await prisma.exam.findFirst({
    where: { id: examId, institutionId },
    select: { id: true, ad: true, tarih: true, sinavTuru: true },
  });
  if (!deneme) return null;

  const cevaplar = await prisma.answerSheet.findMany({
    where: { examResult: { examId } },
    select: {
      dersGrubu: true,
      kitapcik: true,
      cevapAnahtari: true,
      ogrenciCevaplari: true,
    },
  });

  const kumeler = new Map<
    string,
    { dersGrubu: string; kitapcik: string | null; cevapAnahtari: string; cevaplar: string[] }
  >();

  for (const cevap of cevaplar) {
    const anahtar = `${cevap.dersGrubu}|${cevap.cevapAnahtari}`;
    const kume = kumeler.get(anahtar);
    if (kume) {
      kume.cevaplar.push(cevap.ogrenciCevaplari);
      // Kitapcik harfi bos gelen kayitlar olabilir; dolu olani kullan.
      if (!kume.kitapcik && cevap.kitapcik) kume.kitapcik = cevap.kitapcik;
    } else {
      kumeler.set(anahtar, {
        dersGrubu: cevap.dersGrubu,
        kitapcik: cevap.kitapcik,
        cevapAnahtari: cevap.cevapAnahtari,
        cevaplar: [cevap.ogrenciCevaplari],
      });
    }
  }

  const gruplar: SoruAnaliziGrubu[] = [...kumeler.values()].map((kume) => {
    const sorular: SoruAnalizi[] = [...kume.cevapAnahtari].map((dogruCevap, index) => {
      const dagilim: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      let dogru = 0;
      let yanlis = 0;
      let bos = 0;

      for (const ogrenciCevabi of kume.cevaplar) {
        const verilen = ogrenciCevabi[index] ?? " ";
        if (verilen === " ") {
          bos += 1;
          continue;
        }
        const harf = verilen.toLocaleUpperCase("tr");
        if (harf in dagilim) dagilim[harf] += 1;
        if (verilen === harf) dogru += 1;
        else yanlis += 1;
      }

      const toplam = dogru + yanlis + bos;
      const celdiriciler = SECENEKLER.filter((secenek) => secenek !== dogruCevap)
        .map((secenek) => ({ secenek, adet: dagilim[secenek] ?? 0 }))
        .sort((a, b) => b.adet - a.adet);

      return {
        soruNo: index + 1,
        dogruCevap,
        dogru,
        yanlis,
        bos,
        toplam,
        basariYuzde: toplam > 0 ? (dogru / toplam) * 100 : 0,
        secenekDagilimi: dagilim,
        enCokCeldirici: celdiriciler[0] && celdiriciler[0].adet > 0 ? celdiriciler[0] : null,
      };
    });

    return {
      dersGrubu: kume.dersGrubu,
      kitapcik: kume.kitapcik,
      ogrenciSayisi: kume.cevaplar.length,
      sorular,
    };
  });

  gruplar.sort(
    (a, b) =>
      grupSiraNo(a.dersGrubu) - grupSiraNo(b.dersGrubu) ||
      (a.kitapcik ?? "").localeCompare(b.kitapcik ?? "", "tr"),
  );

  const enZorSorular: ZorSoru[] = gruplar
    .flatMap((grup) =>
      grup.sorular.map((soru) => ({
        ...soru,
        dersGrubu: grup.dersGrubu,
        kitapcik: grup.kitapcik,
      })),
    )
    .sort((a, b) => a.basariYuzde - b.basariYuzde || b.yanlis - a.yanlis)
    .slice(0, 15);

  return { deneme, gruplar, enZorSorular };
});

/**
 * Kurumdaki ogrenciler; arama ve sinif filtresiyle.
 * SQLite'ta buyuk/kucuk harf duyarsiz arama desteklenmedigi icin arama
 * normalize edilmis (buyuk harfli) ad alani uzerinden yapiliyor.
 */
export const ogrenciListesi = cache(async (
  institutionId: string,
  filtre: { arama?: string; sinif?: string } = {},
) => {
  const arama = filtre.arama?.trim();

  const [ogrenciler, siniflar, sonDeneme] = await Promise.all([
    prisma.student.findMany({
      where: {
        institutionId,
        aktif: true,
        ...(filtre.sinif ? { sinif: filtre.sinif } : {}),
        ...(arama ? { normalizedAd: { contains: arama.toLocaleUpperCase("tr") } } : {}),
      },
      select: {
        id: true,
        adSoyad: true,
        sinif: true,
        ogrenciNo: true,
        _count: { select: { sonuclar: true } },
      },
    }),
    prisma.student.groupBy({
      by: ["sinif"],
      where: { institutionId, aktif: true },
      _count: { _all: true },
    }),
    prisma.exam.findFirst({
      where: { institutionId },
      orderBy: { tarih: "desc" },
      select: { id: true, ad: true, tarih: true },
    }),
  ]);

  const ogrenciIdleri = ogrenciler.map((ogrenci) => ogrenci.id);

  const [ortalamalar, sonDenemeSonuclari] = await Promise.all([
    ogrenciIdleri.length > 0
      ? prisma.examResult.groupBy({
          by: ["studentId"],
          where: { studentId: { in: ogrenciIdleri } },
          _avg: { toplamNet: true, puan: true },
          _max: { toplamNet: true },
        })
      : Promise.resolve([]),
    sonDeneme && ogrenciIdleri.length > 0
      ? prisma.examResult.findMany({
          where: { examId: sonDeneme.id, studentId: { in: ogrenciIdleri } },
          select: { studentId: true, toplamNet: true, puan: true },
        })
      : Promise.resolve([]),
  ]);

  const ortalamaHaritasi = new Map(ortalamalar.map((o) => [o.studentId, o]));
  const sonDenemeHaritasi = new Map(sonDenemeSonuclari.map((s) => [s.studentId, s]));

  return {
    sonDeneme,
    siniflar: siniflar
      .map((satir) => ({ sinif: satir.sinif, adet: satir._count._all }))
      .filter((satir): satir is { sinif: string; adet: number } => Boolean(satir.sinif))
      .sort((a, b) => a.sinif.localeCompare(b.sinif, "tr")),
    ogrenciler: ogrenciler
      .map((ogrenci) => ({
        id: ogrenci.id,
        adSoyad: ogrenci.adSoyad,
        sinif: ogrenci.sinif,
        ogrenciNo: ogrenci.ogrenciNo,
        denemeSayisi: ogrenci._count.sonuclar,
        ortalamaNet: ortalamaHaritasi.get(ogrenci.id)?._avg.toplamNet ?? null,
        enYuksekNet: ortalamaHaritasi.get(ogrenci.id)?._max.toplamNet ?? null,
        ortalamaPuan: ortalamaHaritasi.get(ogrenci.id)?._avg.puan ?? null,
        sonDenemeNet: sonDenemeHaritasi.get(ogrenci.id)?.toplamNet ?? null,
        sonDenemePuan: sonDenemeHaritasi.get(ogrenci.id)?.puan ?? null,
      }))
      // SQLite sıralaması Türkçe harfleri dogru siralamadigi icin burada siraliyoruz.
      .sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr")),
  };
});

/** Bir ogrencinin tum denemelerdeki gelisimi */
export const ogrenciAnalizi = cache(async (studentId: string, institutionId: string) => {
  const ogrenci = await prisma.student.findFirst({
    where: { id: studentId, institutionId },
    select: {
      id: true,
      adSoyad: true,
      sinif: true,
      ogrenciNo: true,
      createdAt: true,
    },
  });
  if (!ogrenci) return null;

  const [sonuclar, kazanimSatirlari] = await Promise.all([
    prisma.examResult.findMany({
      where: { studentId },
      orderBy: { exam: { tarih: "asc" } },
      select: {
        id: true,
        puan: true,
        yuzdelikDilim: true,
        toplamSoru: true,
        toplamDogru: true,
        toplamYanlis: true,
        toplamBos: true,
        toplamNet: true,
        genelSira: true,
        exam: { select: { id: true, ad: true, tarih: true } },
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
          },
        },
      },
    }),
    prisma.topicResult.findMany({
      where: { examResult: { studentId } },
      select: {
        examResultId: true,
        dersAdi: true,
        dersGrubu: true,
        kazanim: true,
        soru: true,
        dogru: true,
        yanlis: true,
      },
    }),
  ]);

  const denemeIdleri = sonuclar.map((sonuc) => sonuc.exam.id);

  // Ogrencinin netini kurum ortalamasiyla karsilastirmak icin
  const kurumOrtalamalari =
    denemeIdleri.length > 0
      ? await prisma.examResult.groupBy({
          by: ["examId"],
          where: { examId: { in: denemeIdleri } },
          _avg: { toplamNet: true },
        })
      : [];
  const kurumHaritasi = new Map(
    kurumOrtalamalari.map((o) => [o.examId, o._avg.toplamNet ?? null]),
  );

  return {
    ogrenci,
    kazanimSatirlari,
    sonuclar: sonuclar.map((sonuc) => ({
      ...sonuc,
      kurumOrtalamaNet: kurumHaritasi.get(sonuc.exam.id) ?? null,
    })),
  };
});

export interface EslesenKazanim {
  dersAdi: string;
  dersGrubu: string;
  kazanim: string;
  denemeSayisi: number;
  yanlisDeneme: number;
  herDenemedeYanlis: boolean;
  sonDenemedeVar: boolean;
  sonDenemedeYanlis: boolean;
  oncekiYanlisDeneme: number;
  soru: number;
  dogru: number;
  yanlis: number;
  basariYuzde: number;
}

export type KazanimGelisimDurumu = "hala" | "duzeldi" | "yeni" | "olculmedi";

export function kazanimGelisimDurumu(
  kazanim: EslesenKazanim,
): KazanimGelisimDurumu | null {
  if (kazanim.sonDenemedeYanlis && kazanim.oncekiYanlisDeneme > 0) return "hala";
  if (kazanim.sonDenemedeYanlis) return "yeni";
  if (kazanim.oncekiYanlisDeneme > 0 && kazanim.sonDenemedeVar && !kazanim.sonDenemedeYanlis) {
    return "duzeldi";
  }
  if (kazanim.oncekiYanlisDeneme > 0 && !kazanim.sonDenemedeVar) return "olculmedi";
  return null;
}

/** Ayni kazanim metnini denemeler arasinda toplar. */
export function kazanimlariEslestir(
  satirlar: Array<{
    examResultId?: string;
    dersAdi: string;
    dersGrubu: string;
    kazanim: string;
    soru: number;
    dogru: number;
    yanlis: number;
  }>,
  denemeSayisi: number,
  sonExamResultId?: string,
): EslesenKazanim[] {
  const harita = new Map<
    string,
    {
      dersAdi: string;
      dersGrubu: string;
      kazanim: string;
      denemeSayisi: number;
      yanlisDeneme: number;
      soru: number;
      dogru: number;
      yanlis: number;
      oturumlar: Map<string, { dogru: number; yanlis: number }>;
    }
  >();

  for (const [index, satir] of satirlar.entries()) {
    const dersAdi = kanonikDersAdi(satir.dersAdi);
    if (!dersAdi) continue;
    const dersGrubu = resolveDersGrubu(dersAdi);
    const anahtar = `${dersGrubu}\0${dersAdi.toLocaleLowerCase("tr")}\0${satir.kazanim.trim().toLocaleLowerCase("tr")}`;
    const oturum = satir.examResultId ?? `satir-${index}`;
    const mevcut = harita.get(anahtar);
    if (mevcut) {
      const oturumToplami = mevcut.oturumlar.get(oturum) ?? { dogru: 0, yanlis: 0 };
      oturumToplami.dogru += satir.dogru;
      oturumToplami.yanlis += satir.yanlis;
      mevcut.oturumlar.set(oturum, oturumToplami);
      mevcut.soru += satir.soru;
      mevcut.dogru += satir.dogru;
      mevcut.yanlis += satir.yanlis;
    } else {
      harita.set(anahtar, {
        dersAdi,
        dersGrubu,
        kazanim: satir.kazanim.trim(),
        denemeSayisi: 0,
        yanlisDeneme: 0,
        soru: satir.soru,
        dogru: satir.dogru,
        yanlis: satir.yanlis,
        oturumlar: new Map([[oturum, { dogru: satir.dogru, yanlis: satir.yanlis }]]),
      });
    }
  }

  const esik = Math.min(2, Math.max(1, denemeSayisi));
  return [...harita.values()]
    .map(({ oturumlar, ...kayit }) => {
      const gorulen = oturumlar.size;
      const yanlisDeneme = [...oturumlar.values()].filter(
        (oturum) => oturum.dogru === 0 && oturum.yanlis > 0,
      ).length;
      const sonOturum = sonExamResultId ? oturumlar.get(sonExamResultId) : undefined;
      const oncekiYanlisDeneme = [...oturumlar.entries()].filter(
        ([oturumId, oturum]) =>
          oturumId !== sonExamResultId && oturum.dogru === 0 && oturum.yanlis > 0,
      ).length;
      return {
        ...kayit,
        denemeSayisi: gorulen,
        yanlisDeneme,
        herDenemedeYanlis: gorulen >= esik && yanlisDeneme === gorulen,
        sonDenemedeVar: Boolean(sonOturum),
        sonDenemedeYanlis: Boolean(sonOturum && sonOturum.dogru === 0 && sonOturum.yanlis > 0),
        oncekiYanlisDeneme,
        basariYuzde: kayit.soru > 0 ? (kayit.dogru / kayit.soru) * 100 : 0,
      };
    })
    .sort(
      (a, b) =>
        Number(b.herDenemedeYanlis) - Number(a.herDenemedeYanlis) ||
        b.yanlisDeneme - a.yanlisDeneme ||
        a.basariYuzde - b.basariYuzde ||
        grupSiraNo(a.dersGrubu) - grupSiraNo(b.dersGrubu) ||
        dersSiraNo(a.dersAdi) - dersSiraNo(b.dersAdi) ||
        a.dersAdi.localeCompare(b.dersAdi, "tr"),
    );
}

/** Ogrencinin tum denemelerindeki kazanım satırları. */
export const ogrenciKazanimlari = cache(async (studentId: string) => {
  return prisma.topicResult.findMany({
    where: { examResult: { studentId } },
    select: {
      examResultId: true,
      dersAdi: true,
      dersGrubu: true,
      kazanim: true,
      soru: true,
      dogru: true,
      yanlis: true,
    },
  });
});

/** Secilen denemenin kazanımları. Veli karnesi tek sinavi ayri okur. */
export const denemeKazanimlari = cache(async (examResultId: string) => {
  return prisma.topicResult.findMany({
    where: { examResultId },
    select: {
      dersAdi: true,
      dersGrubu: true,
      kazanim: true,
      soru: true,
      dogru: true,
      yanlis: true,
      basariYuzde: true,
    },
  });
});
