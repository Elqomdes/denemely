import Link from "next/link";
import { notFound } from "next/navigation";
import { Kart } from "@/components/Kutu";
import { SayfaUstu } from "@/components/SayfaUstu";
import { ElleBirlestirFormu } from "@/components/ogrenci/ElleBirlestirFormu";
import { OgrenciDuzenleFormu } from "@/components/ogrenci/OgrenciDuzenleFormu";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { tamSayi } from "@/lib/format";
import { birlestirilebilirOgrenciler } from "@/lib/ogrenci/islemler";

export async function generateMetadata({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const ogrenci = await prisma.student.findUnique({
    where: { id: studentId },
    select: { adSoyad: true },
  });
  return { title: ogrenci ? `${ogrenci.adSoyad} — Düzenle` : "Öğrenci Düzenle" };
}

export default async function OgrenciDuzenleSayfasi({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const { kurum } = await kurumOturumuGerekli();

  const ogrenci = await prisma.student.findFirst({
    where: { id: studentId, institutionId: kurum.id },
    select: {
      id: true,
      adSoyad: true,
      sinif: true,
      ogrenciNo: true,
      _count: { select: { sonuclar: true } },
    },
  });
  if (!ogrenci) notFound();

  const [siniflar, digerleri] = await Promise.all([
    prisma.student.groupBy({
      by: ["sinif"],
      where: { institutionId: kurum.id },
    }),
    birlestirilebilirOgrenciler(kurum.id, ogrenci.id),
  ]);

  const sinifListesi = siniflar
    .map((satir) => satir.sinif)
    .filter((sinif): sinif is string => Boolean(sinif))
    .sort((a, b) => a.localeCompare(b, "tr"));

  return (
    <div className="space-y-4">
      <SayfaUstu
        baslik={ogrenci.adSoyad}
        meta={`Kayıt düzenleme · ${tamSayi(ogrenci._count.sonuclar)} deneme`}
        geri={{ yazi: "Analize dön", yol: `/panel/ogrenciler/${ogrenci.id}` }}
      >
        <Link href="/panel/ogrenciler/birlestir" className="btn btn-ikincil btn-kucuk">
          Birleştirme önerileri
        </Link>
      </SayfaUstu>

      <Kart
        baslik="Öğrenci bilgileri"
        aciklama="Ad düzeltmesi yalnızca bu kayıttaki görünen adı değiştirir, deneme sonuçları korunur."
      >
        <OgrenciDuzenleFormu ogrenci={ogrenci} siniflar={sinifListesi} />
      </Kart>

      <Kart
        baslik="Başka bir kayıtla birleştir"
        aciklama="Aynı öğrenci iki ayrı kayıt olarak oluştuysa sonuçları burada tek kayıtta toplayın."
      >
        <ElleBirlestirFormu
          hedefId={ogrenci.id}
          hedefAd={ogrenci.adSoyad}
          digerleri={digerleri}
        />
      </Kart>
    </div>
  );
}
