import Link from "next/link";
import { Etiket, Kart } from "@/components/Kutu";
import { OnizlemeFormu } from "@/components/OnizlemeFormu";
import { OlcutSerit, SayfaUstu } from "@/components/SayfaUstu";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { net, puan, tamSayi, tarihInput } from "@/lib/format";
import { onizlemeHazirla, varsayilanDenemeAdi } from "@/lib/import/eslestir";
import { asamaOku } from "@/lib/import/staging";
import { formatEtiketi } from "@/lib/pdf/types";
import { yuklemeIptal } from "../actions";

export const metadata = { title: "Yükleme Önizlemesi" };

const DURUM_ETIKETLERI = {
  mevcut: { yazi: "Kayıtlı", ton: "notr" as const },
  "takma-ad": { yazi: "Birleştirilmiş yazım", ton: "marka" as const },
  yeni: { yazi: "Yeni", ton: "olumlu" as const },
  kopya: { yazi: "Ad tekrar ediyor", ton: "uyari" as const },
};

export default async function OnizlemePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { kurum } = await kurumOturumuGerekli();

  const asama = await asamaOku(token, kurum.id);
  if (!asama) {
    return (
      <div className="panel border-amber-200 bg-amber-50 p-6">
        <h1 className="text-base font-semibold text-amber-900">Yükleme bulunamadı</h1>
        <p className="mt-2 text-sm text-amber-800">
          Bu önizleme artık geçerli değil. Sonuç belgesini yeniden yükleyebilirsiniz.
        </p>
        <Link href="/panel/denemeler/yukle" className="btn btn-birincil mt-5">
          Yeniden yükle
        </Link>
      </div>
    );
  }

  const varsayilanAd = varsayilanDenemeAdi(asama.parsed, asama.dosyaAdi);
  const bugun = new Date();
  const onizleme = await onizlemeHazirla(kurum.id, asama.parsed, varsayilanAd, bugun);
  const kazanimToplami = asama.parsed.ogrenciler.reduce((t, o) => t + o.kazanimlar.length, 0);

  return (
    <div className="space-y-4">
      <SayfaUstu
        baslik="Yükleme önizlemesi"
        meta={`${asama.dosyaAdi} · ${formatEtiketi(asama.parsed.profilAdi ? `PROFIL:${asama.parsed.profilAdi}` : asama.parsed.format)}`}
        geri={{ yazi: "Yeniden yükle", yol: "/panel/denemeler/yukle" }}
      />

      <OlcutSerit
        ogeler={[
          { etiket: "Öğrenci", deger: tamSayi(onizleme.satirlar.length) },
          {
            etiket: "Kayıtlı",
            deger: tamSayi(onizleme.mevcutSayisi),
            not:
              onizleme.takmaAdSayisi > 0
                ? `${onizleme.takmaAdSayisi} birleşik yazım`
                : undefined,
          },
          { etiket: "Yeni", deger: tamSayi(onizleme.yeniSayisi) },
          { etiket: "Kazanım", deger: tamSayi(kazanimToplami) },
        ]}
      />

      {onizleme.kopyaSayisi > 0 ? (
        <p className="uyari-serit border-amber-200 bg-amber-50 text-amber-800">
          Belgede aynı ada sahip {onizleme.kopyaSayisi} öğrenci var. Aynı isimler tek bir öğrenci
          kaydına yazılır; farklı öğrencilerse kaydettikten sonra Öğrenciler sayfasından adlarını
          ayırt edilecek şekilde düzeltmeniz gerekir.
        </p>
      ) : null}

      {onizleme.eksikBolumluSayisi > 0 ? (
        <p className="uyari-serit border-cerceve bg-white text-slate-600">
          {onizleme.eksikBolumluSayisi} öğrencinin karnesinde dört bölümün tamamı yok. Bu öğrenciler
          ilgili bölümü hiç işaretlememiş; belgede o bölüm basılmadığı için analizde de yer
          almayacak.
        </p>
      ) : null}

      {asama.parsed.uyarilar.length > 0 ? (
        <div className="uyari-serit border-amber-200 bg-amber-50 text-amber-800">
          <p className="font-semibold">Okuma uyarıları</p>
          <ul className="mt-1 list-inside list-disc">
            {asama.parsed.uyarilar.slice(0, 5).map((uyari) => (
              <li key={uyari}>{uyari}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Kart
        baslik="Deneme bilgileri"
        aciklama="Bu bilgiler denemenin panelde nasıl görüneceğini belirler."
      >
        <OnizlemeFormu
          token={asama.token}
          varsayilanAd={varsayilanAd}
          varsayilanTarih={tarihInput(bugun)}
          ogrenciSayisi={onizleme.satirlar.length}
        />
      </Kart>

      <Kart
        baslik="Okunan öğrenciler"
        sagUst={<span className="text-sm text-slate-500">{onizleme.satirlar.length} sayfa</span>}
      >
        <div className="overflow-x-auto">
          <table className="tablo">
            <thead>
              <tr>
                <th className="sayi">Sayfa</th>
                <th>Öğrenci</th>
                <th>Sınıf</th>
                <th>Durum</th>
                <th className="sayi">Puan</th>
                <th className="sayi">Net</th>
                <th className="sayi">Bölüm</th>
                <th className="sayi">Kazanım</th>
              </tr>
            </thead>
            <tbody>
              {onizleme.satirlar.map((satir) => {
                const etiket = DURUM_ETIKETLERI[satir.durum];
                return (
                  <tr key={`${satir.sayfaNo}-${satir.normalizedAd}`}>
                    <td className="sayi text-slate-500">{satir.sayfaNo}</td>
                    <td className="font-medium text-slate-900">
                      {satir.ad}
                      {satir.mevcutAd ? (
                        <p className="text-xs font-normal text-slate-500">
                          Kayıtlı adı: {satir.mevcutAd}
                        </p>
                      ) : null}
                    </td>
                    <td className="text-slate-600">
                      {satir.sinif ?? "—"}
                      {satir.mevcutSinif && satir.mevcutSinif !== satir.sinif ? (
                        <span className="ml-1 text-xs text-slate-400">
                          (kayıtlı: {satir.mevcutSinif})
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <Etiket ton={etiket.ton}>{etiket.yazi}</Etiket>
                    </td>
                    <td className="sayi text-slate-700">{puan(satir.puan)}</td>
                    <td className="sayi font-semibold text-slate-900">{net(satir.net)}</td>
                    <td className="sayi text-slate-600">{satir.dersGrubuSayisi}/4</td>
                    <td className="sayi text-slate-600">{satir.kazanimSayisi}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Kart>

      <form action={yuklemeIptal}>
        <input type="hidden" name="token" value={asama.token} />
        <button type="submit" className="btn btn-ikincil btn-kucuk">
          Yüklemeyi iptal et
        </button>
      </form>
    </div>
  );
}
