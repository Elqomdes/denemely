import Link from "next/link";
import { HizliLink } from "@/components/HizliLink";
import { BosDurum, Kart } from "@/components/Kutu";
import { SayfaUstu } from "@/components/SayfaUstu";
import { SinavTuruSecici } from "@/components/SinavTuruSecici";
import { ogrenciListesi } from "@/lib/analiz";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { kisaTarih, net, puan, tamSayi } from "@/lib/format";
import { birlestirmeAdaylari } from "@/lib/ogrenci/islemler";
import { parseSinavTuru, sinavQuery } from "@/lib/sinav";

export const metadata = { title: "Öğrenciler" };

export default async function OgrencilerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string; sinif?: string; sinav?: string }>;
}) {
  const { kurum } = await kurumOturumuGerekli();
  const { arama, sinif, sinav } = await searchParams;
  const sinavTuru = parseSinavTuru(sinav);
  const [{ ogrenciler, siniflar, sonDeneme }, adaylar] = await Promise.all([
    ogrenciListesi(kurum.id, { arama, sinif, sinavTuru }),
    birlestirmeAdaylari(kurum.id),
  ]);

  const filtreVar = Boolean(arama || sinif);
  const filtreParams = { arama, sinif };

  return (
    <div className="space-y-4">
      <SayfaUstu
        baslik="Öğrenciler"
        meta={sonDeneme ? `Son ${sinavTuru}: ${sonDeneme.ad}` : `Henüz ${sinavTuru} denemesi yok`}
      >
        <SinavTuruSecici deger={sinavTuru} yol="/panel/ogrenciler" params={filtreParams} />
        <Link href="/panel/ogrenciler/birlestir" className="btn btn-ikincil btn-kucuk">
          Kayıt birleştir{adaylar.length > 0 ? ` (${tamSayi(adaylar.length)})` : ""}
        </Link>
      </SayfaUstu>

      {adaylar.length > 0 ? (
        <div className="uyari-serit flex flex-wrap items-center justify-between gap-2 border-amber-200 bg-amber-50 text-amber-900">
          <p>
            {tamSayi(adaylar.length)} kayıt ikilisi aynı öğrenciye ait görünüyor. Optik formda ikinci
            ad bazen kodlanmıyor.
          </p>
          <Link href="/panel/ogrenciler/birlestir" className="btn btn-birincil btn-kucuk">
            İncele
          </Link>
        </div>
      ) : null}

      {ogrenciler.length === 0 && !filtreVar ? (
        <BosDurum
          baslik="Henüz öğrenci yok"
          aciklama="İlk deneme sonucunu yüklediğinizde öğrenciler otomatik oluşur."
          baglantiYazisi="Deneme yükle"
          baglantiYolu="/panel/denemeler/yukle"
        />
      ) : (
        <Kart>
          <form className="flex flex-wrap items-end gap-2 border-b border-cerceve px-3 py-2.5" method="get">
            <input type="hidden" name="sinav" value={sinavTuru} />
            <div className="min-w-48 flex-1">
              <label htmlFor="arama" className="sr-only">
                Öğrenci ara
              </label>
              <input
                id="arama"
                name="arama"
                type="search"
                defaultValue={arama ?? ""}
                placeholder="Ad veya soyad"
                className="alan"
              />
            </div>
            <div className="min-w-40">
              <label htmlFor="sinif" className="sr-only">
                Sınıf
              </label>
              <select id="sinif" name="sinif" defaultValue={sinif ?? ""} className="alan">
                <option value="">Tüm sınıflar</option>
                {siniflar.map((satir) => (
                  <option key={satir.sinif} value={satir.sinif}>
                    {satir.sinif} ({satir.adet})
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-birincil">
              Filtrele
            </button>
            {filtreVar ? (
              <Link href={`/panel/ogrenciler?${sinavQuery(sinavTuru)}`} className="btn btn-ikincil">
                Temizle
              </Link>
            ) : null}
            <p className="ml-auto text-[12.5px] text-slate-500">
              {tamSayi(ogrenciler.length)} öğrenci
              {sonDeneme ? ` · ${sinavTuru} son kolon: ${kisaTarih(sonDeneme.tarih)}` : ` · ${sinavTuru}`}
            </p>
          </form>

          {ogrenciler.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">Bu filtreye uyan öğrenci yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tablo">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Sınıf</th>
                    <th className="sayi">{sinavTuru} deneme</th>
                    <th className="sayi">Ort. net</th>
                    <th className="sayi">En yüksek</th>
                    <th className="sayi">Son deneme</th>
                    <th className="sayi">Ort. puan</th>
                  </tr>
                </thead>
                <tbody>
                  {ogrenciler.map((ogrenci) => (
                    <tr key={ogrenci.id}>
                      <td>
                        <HizliLink
                          href={`/panel/ogrenciler/${ogrenci.id}?sinav=${sinavTuru}`}
                          className="baglanti"
                        >
                          {ogrenci.adSoyad}
                        </HizliLink>
                        {ogrenci.ogrenciNo && ogrenci.ogrenciNo !== "0" ? (
                          <p className="text-[12px] text-slate-500">No: {ogrenci.ogrenciNo}</p>
                        ) : null}
                      </td>
                      <td className="text-slate-600">{ogrenci.sinif ?? "—"}</td>
                      <td className="sayi text-slate-600">{tamSayi(ogrenci.denemeSayisi)}</td>
                      <td className="sayi font-semibold text-slate-900">{net(ogrenci.ortalamaNet)}</td>
                      <td className="sayi text-slate-600">{net(ogrenci.enYuksekNet)}</td>
                      <td className="sayi text-slate-600">{net(ogrenci.sonDenemeNet)}</td>
                      <td className="sayi text-slate-600">{puan(ogrenci.ortalamaPuan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Kart>
      )}
    </div>
  );
}
