import Link from "next/link";
import { CizgiGrafik } from "@/components/grafikler/istemci";
import { GRAFIK_RENKLERI } from "@/components/grafikler/renkler";
import { HizliLink } from "@/components/HizliLink";
import { YukleIkonu } from "@/components/Ikonlar";
import { BosDurum, Kart } from "@/components/Kutu";
import { OlcutSerit, SayfaUstu } from "@/components/SayfaUstu";
import { SinavTuruSecici } from "@/components/SinavTuruSecici";
import { grupKisaAdi, kurumOzeti } from "@/lib/analiz";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { basariArkaPlani, kisaTarih, net, puan, tamSayi, yuzde } from "@/lib/format";
import { birlestirmeAdaylari } from "@/lib/ogrenci/islemler";
import { parseSinavTuru } from "@/lib/sinav";

export const metadata = { title: "Genel Bakış" };

export default async function PanelAnaSayfa({
  searchParams,
}: {
  searchParams: Promise<{ sinav?: string }>;
}) {
  const { kurum } = await kurumOturumuGerekli();
  const { sinav } = await searchParams;
  const sinavTuru = parseSinavTuru(sinav);
  const [ozet, adaylar] = await Promise.all([
    kurumOzeti(kurum.id, sinavTuru),
    birlestirmeAdaylari(kurum.id),
  ]);

  if (ozet.denemeSayisi === 0) {
    return (
      <div>
        <SayfaUstu baslik="Genel bakış">
          <SinavTuruSecici deger={sinavTuru} yol="/panel" />
          <Link href="/panel/denemeler/yukle" className="btn btn-birincil btn-kucuk">
            <YukleIkonu className="h-4 w-4" />
            Deneme yükle
          </Link>
        </SayfaUstu>
        <BosDurum
          baslik={`Henüz ${sinavTuru} denemesi yok`}
          aciklama={`${sinavTuru} sonuç belgesini yüklediğinizde analizler burada oluşur.`}
          baglantiYazisi="Deneme yükle"
          baglantiYolu="/panel/denemeler/yukle"
        />
      </div>
    );
  }

  const trendVerisi = ozet.trend.map((deneme) => ({
    etiket: kisaTarih(deneme.tarih),
    ortalamaNet: deneme.ortalamaNet,
  }));

  return (
    <div className="space-y-6">
      <SayfaUstu
        baslik="Genel bakış"
        meta={ozet.sonDeneme ? `Son ${sinavTuru}: ${ozet.sonDeneme.ad}` : undefined}
      >
        <SinavTuruSecici deger={sinavTuru} yol="/panel" />
        <Link href="/panel/denemeler/yukle" className="btn btn-birincil btn-kucuk">
          <YukleIkonu className="h-4 w-4" />
          Deneme yükle
        </Link>
      </SayfaUstu>

      {adaylar.length > 0 ? (
        <div className="uyari-serit flex flex-wrap items-center justify-between gap-2 border-amber-200 bg-amber-50 text-amber-900">
          <p>{tamSayi(adaylar.length)} öğrenci kaydı birleştirilmeyi bekliyor.</p>
          <Link href="/panel/ogrenciler/birlestir" className="btn btn-ikincil btn-kucuk">
            İncele
          </Link>
        </div>
      ) : null}

      <OlcutSerit
        ogeler={[
          { etiket: "Deneme", deger: tamSayi(ozet.denemeSayisi) },
          { etiket: "Öğrenci", deger: tamSayi(ozet.ogrenciSayisi) },
          {
            etiket: "Son ort. net",
            deger: net(ozet.sonDeneme?.ortalamaNet),
            not: ozet.sonDeneme ? `${tamSayi(ozet.sonDeneme.katilim)} katılım` : undefined,
          },
          { etiket: "Son ort. puan", deger: puan(ozet.sonDeneme?.ortalamaPuan) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
        <Kart
          baslik="Son denemeler"
          sagUst={
            <Link href="/panel/denemeler" className="text-[13px] text-slate-500 hover:text-slate-800">
              Tümü
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="tablo">
              <thead>
                <tr>
                  <th>Deneme</th>
                  <th>Tarih</th>
                  <th className="sayi">Katılım</th>
                  <th className="sayi">Ort. net</th>
                  <th className="sayi">Ort. puan</th>
                </tr>
              </thead>
              <tbody>
                {[...ozet.trend].reverse().map((deneme) => (
                  <tr key={deneme.examId}>
                    <td>
                      <HizliLink href={`/panel/denemeler/${deneme.examId}`} className="baglanti">
                        {deneme.ad}
                      </HizliLink>
                    </td>
                    <td className="text-slate-600">{kisaTarih(deneme.tarih)}</td>
                    <td className="sayi text-slate-600">{tamSayi(deneme.katilim)}</td>
                    <td className="sayi font-semibold text-slate-900">{net(deneme.ortalamaNet)}</td>
                    <td className="sayi text-slate-600">{puan(deneme.ortalamaPuan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kart>

        <Kart baslik="Zayıf kazanımlar">
          {ozet.zayifKazanimlar.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">Kazanım verisi yok.</p>
          ) : (
            <ul>
              {ozet.zayifKazanimlar.map((kazanim) => (
                <li
                  key={`${kazanim.dersAdi}-${kazanim.kazanim}`}
                  className="flex items-start justify-between gap-2 border-b border-cerceve-soluk px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] text-slate-900">{kazanim.kazanim}</p>
                    <p className="text-[12px] text-slate-500">
                      {kazanim.dersAdi} · {tamSayi(kazanim.soru)} soru
                    </p>
                  </div>
                  <span
                    className={`tabular shrink-0 border px-1.5 py-px text-[12.5px] font-medium ${basariArkaPlani(
                      kazanim.basariYuzde,
                    )}`}
                  >
                    {yuzde(kazanim.basariYuzde)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Kart>
      </div>

      {ozet.sonDeneme ? (
        <Kart baslik="Kurum neti" aciklama="Son denemelerde net ortalamasının gelişimi">
          <div className="px-4 py-5">
            <CizgiGrafik
              veri={trendVerisi}
              seriler={[
                { anahtar: "ortalamaNet", ad: "Kurum ortalaması", renk: GRAFIK_RENKLERI.marka },
              ]}
            />
          </div>
          {ozet.sonDeneme.gruplar.length > 0 ? (
            <p className="border-t border-cerceve px-4 py-2 text-[13px] text-slate-500">
              {ozet.sonDeneme.ad}:{" "}
              {ozet.sonDeneme.gruplar
                .map((grup) => `${grupKisaAdi(grup.dersGrubu)} ${net(grup.ortalamaNet)}`)
                .join(" · ")}
            </p>
          ) : null}
        </Kart>
      ) : null}
    </div>
  );
}
