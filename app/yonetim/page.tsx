import Link from "next/link";
import { Etiket, Kart } from "@/components/Kutu";
import { OlcutSerit, SayfaUstu } from "@/components/SayfaUstu";
import { KurumOlusturFormu } from "@/components/yonetim/KurumFormlari";
import { superadminGerekli } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { kisaTarih, tamSayi } from "@/lib/format";

export const metadata = { title: "Kurumlar" };

export default async function YonetimAnaSayfa() {
  await superadminGerekli();

  const kurumlar = await prisma.institution.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ad: true,
      slug: true,
      il: true,
      ilce: true,
      aktif: true,
      createdAt: true,
      _count: { select: { kullanicilar: true, ogrenciler: true, denemeler: true } },
    },
  });

  const toplamOgrenci = kurumlar.reduce((toplam, kurum) => toplam + kurum._count.ogrenciler, 0);
  const toplamDeneme = kurumlar.reduce((toplam, kurum) => toplam + kurum._count.denemeler, 0);
  const aktifKurum = kurumlar.filter((kurum) => kurum.aktif).length;

  return (
    <div className="space-y-4">
      <SayfaUstu baslik="Kurumlar" meta="Denemely kullanan kurumlar ve yetkili hesapları" />

      <OlcutSerit
        ogeler={[
          { etiket: "Kurum", deger: tamSayi(kurumlar.length), not: `${aktifKurum} aktif` },
          { etiket: "Öğrenci", deger: tamSayi(toplamOgrenci) },
          { etiket: "Deneme", deger: tamSayi(toplamDeneme) },
          {
            etiket: "Yetkili",
            deger: tamSayi(kurumlar.reduce((t, k) => t + k._count.kullanicilar, 0)),
          },
        ]}
      />

      <Kart
        baslik="Yeni kurum ekle"
        aciklama="Kurumu oluşturduktan sonra yetkili hesabını kurum sayfasından açabilirsiniz."
      >
        <KurumOlusturFormu />
      </Kart>

      <Kart baslik="Kayıtlı kurumlar">
        {kurumlar.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Henüz kurum eklenmedi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tablo">
              <thead>
                <tr>
                  <th>Kurum</th>
                  <th>Giriş adresi</th>
                  <th>Durum</th>
                  <th className="sayi">Yetkili</th>
                  <th className="sayi">Öğrenci</th>
                  <th className="sayi">Deneme</th>
                  <th>Eklendi</th>
                </tr>
              </thead>
              <tbody>
                {kurumlar.map((kurum) => (
                  <tr key={kurum.id}>
                    <td>
                      <Link href={`/yonetim/kurumlar/${kurum.id}`} className="baglanti">
                        {kurum.ad}
                      </Link>
                      {kurum.il || kurum.ilce ? (
                        <p className="text-xs text-slate-500">
                          {[kurum.il, kurum.ilce].filter(Boolean).join(" / ")}
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <Link
                        href={`/k/${kurum.slug}`}
                        className="text-slate-600 underline-offset-2 hover:underline"
                      >
                        /k/{kurum.slug}
                      </Link>
                    </td>
                    <td>
                      {kurum.aktif ? (
                        <Etiket ton="olumlu">Aktif</Etiket>
                      ) : (
                        <Etiket ton="uyari">Pasif</Etiket>
                      )}
                    </td>
                    <td className="sayi text-slate-600">{tamSayi(kurum._count.kullanicilar)}</td>
                    <td className="sayi text-slate-600">{tamSayi(kurum._count.ogrenciler)}</td>
                    <td className="sayi text-slate-600">{tamSayi(kurum._count.denemeler)}</td>
                    <td className="text-slate-500">{kisaTarih(kurum.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kart>
    </div>
  );
}
