import Link from "next/link";
import { notFound } from "next/navigation";
import { Etiket, Kart } from "@/components/Kutu";
import { OlcutSerit, SayfaUstu } from "@/components/SayfaUstu";
import { KurumDuzenleFormu } from "@/components/yonetim/KurumFormlari";
import { KullaniciOlusturFormu, SifreSifirlaFormu } from "@/components/yonetim/KullaniciFormlari";
import { superadminGerekli } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { kisaTarih, net, tamSayi } from "@/lib/format";
import { kullaniciDurumDegistir } from "../../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kurum = await prisma.institution.findUnique({ where: { id }, select: { ad: true } });
  return { title: kurum?.ad ?? "Kurum" };
}

export default async function KurumDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ durum?: string }>;
}) {
  const [{ id }, { durum }] = await Promise.all([params, searchParams]);
  await superadminGerekli();

  const kurum = await prisma.institution.findUnique({
    where: { id },
    select: {
      id: true,
      ad: true,
      slug: true,
      il: true,
      ilce: true,
      logoUrl: true,
      aktif: true,
      createdAt: true,
      kullanicilar: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kullaniciAdi: true,
          adSoyad: true,
          aktif: true,
          sonGirisTarihi: true,
          createdAt: true,
        },
      },
      _count: { select: { ogrenciler: true, denemeler: true } },
    },
  });
  if (!kurum) notFound();

  const denemeler = await prisma.exam.findMany({
    where: { institutionId: kurum.id },
    orderBy: { tarih: "desc" },
    take: 5,
    select: { id: true, ad: true, tarih: true, _count: { select: { sonuclar: true } } },
  });

  const ortalama = await prisma.examResult.aggregate({
    where: { exam: { institutionId: kurum.id } },
    _avg: { toplamNet: true },
  });

  return (
    <div className="space-y-4">
      <SayfaUstu
        baslik={
          <span className="inline-flex flex-wrap items-center gap-2">
            {kurum.ad}
            {kurum.aktif ? <Etiket ton="olumlu">Aktif</Etiket> : <Etiket ton="uyari">Pasif</Etiket>}
          </span>
        }
        meta={
          <>
            <Link href={`/k/${kurum.slug}`} className="baglanti">
              /k/{kurum.slug}
            </Link>
            {` · ${kisaTarih(kurum.createdAt)}`}
          </>
        }
        geri={{ yazi: "Kurumlar", yol: "/yonetim" }}
      />

      {durum === "olusturuldu" ? (
        <p className="uyari-serit border-emerald-200 bg-emerald-50 text-emerald-800">
          Kurum oluşturuldu. Şimdi rehberlik öğretmeni veya yetkili için bir hesap açın.
        </p>
      ) : null}

      <OlcutSerit
        ogeler={[
          { etiket: "Öğrenci", deger: tamSayi(kurum._count.ogrenciler) },
          { etiket: "Deneme", deger: tamSayi(kurum._count.denemeler) },
          { etiket: "Yetkili", deger: tamSayi(kurum.kullanicilar.length) },
          { etiket: "Ort. net", deger: net(ortalama._avg.toplamNet) },
        ]}
      />

      <Kart baslik="Kurum bilgileri">
        <KurumDuzenleFormu kurum={kurum} />
      </Kart>

      <Kart
        baslik="Yetkili hesabı ekle"
        aciklama="Rehberlik öğretmeni veya kurum yöneticisi için kullanıcı adı ve şifre oluşturun. E-posta gerekmez."
      >
        <KullaniciOlusturFormu institutionId={kurum.id} />
      </Kart>

      <Kart baslik="Yetkili hesapları">
        {kurum.kullanicilar.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Bu kurum için henüz hesap açılmadı.
          </p>
        ) : (
          <ul>
            {kurum.kullanicilar.map((kullanici) => (
              <li
                key={kullanici.id}
                className="space-y-3 border-b border-cerceve-soluk px-5 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{kullanici.adSoyad}</p>
                      {kullanici.aktif ? (
                        <Etiket ton="olumlu">Aktif</Etiket>
                      ) : (
                        <Etiket ton="uyari">Pasif</Etiket>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      Kullanıcı adı:{" "}
                      <span className="font-medium text-slate-800">{kullanici.kullaniciAdi}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {kullanici.sonGirisTarihi
                        ? `Son giriş: ${kisaTarih(kullanici.sonGirisTarihi)}`
                        : "Henüz giriş yapmadı"}
                    </p>
                  </div>

                  <form action={kullaniciDurumDegistir}>
                    <input type="hidden" name="userId" value={kullanici.id} />
                    <button type="submit" className="btn btn-ikincil btn-kucuk">
                      {kullanici.aktif ? "Erişimi kapat" : "Erişimi aç"}
                    </button>
                  </form>
                </div>

                <SifreSifirlaFormu userId={kullanici.id} kullaniciAdi={kullanici.kullaniciAdi} />
              </li>
            ))}
          </ul>
        )}
      </Kart>

      <Kart baslik="Son denemeler" aciklama="Kurumun yüklediği son beş deneme">
        {denemeler.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Bu kurum henüz deneme yüklemedi.
          </p>
        ) : (
          <table className="tablo">
            <thead>
              <tr>
                <th>Deneme</th>
                <th>Tarih</th>
                <th className="sayi">Katılım</th>
              </tr>
            </thead>
            <tbody>
              {denemeler.map((deneme) => (
                <tr key={deneme.id}>
                  <td className="font-medium text-slate-800">{deneme.ad}</td>
                  <td className="text-slate-600">{kisaTarih(deneme.tarih)}</td>
                  <td className="sayi text-slate-600">{tamSayi(deneme._count.sonuclar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Kart>
    </div>
  );
}
