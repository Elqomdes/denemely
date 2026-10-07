import Link from "next/link";
import { HizliLink } from "@/components/HizliLink";
import { BosDurum, Etiket, Kart } from "@/components/Kutu";
import { SayfaUstu } from "@/components/SayfaUstu";
import { SinavTuruSecici } from "@/components/SinavTuruSecici";
import { denemeListesi } from "@/lib/analiz";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { kisaTarih, net, puan, tamSayi } from "@/lib/format";
import { formatEtiketi } from "@/lib/pdf/types";
import { parseSinavTuru } from "@/lib/sinav";

export const metadata = { title: "Denemeler" };

export default async function DenemelerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; sinav?: string }>;
}) {
  const { kurum } = await kurumOturumuGerekli();
  const { durum, sinav } = await searchParams;
  const sinavTuru = parseSinavTuru(sinav);
  const denemeler = await denemeListesi(kurum.id, sinavTuru);

  return (
    <div className="space-y-4">
      <SayfaUstu baslik="Denemeler" meta={`${tamSayi(denemeler.length)} ${sinavTuru} kaydı`}>
        <SinavTuruSecici deger={sinavTuru} yol="/panel/denemeler" />
        <Link href="/panel/denemeler/yukle" className="btn btn-birincil btn-kucuk">
          Deneme yükle
        </Link>
      </SayfaUstu>

      {durum === "silindi" ? (
        <p className="uyari-serit border-emerald-200 bg-emerald-50 text-emerald-800">
          Deneme ve bağlı sonuçları silindi.
        </p>
      ) : null}

      {denemeler.length === 0 ? (
        <BosDurum
          baslik={`Henüz ${sinavTuru} denemesi yok`}
          aciklama={`${sinavTuru} sonuç belgesini yüklerken sınav türünü ${sinavTuru} seçin.`}
          baglantiYazisi="Deneme yükle"
          baglantiYolu="/panel/denemeler/yukle"
        />
      ) : (
        <Kart>
          <div className="overflow-x-auto">
            <table className="tablo">
              <thead>
                <tr>
                  <th>Deneme</th>
                  <th>Tarih</th>
                  <th>Tür</th>
                  <th className="sayi">Katılım</th>
                  <th className="sayi">Ort. net</th>
                  <th className="sayi">En yüksek</th>
                  <th className="sayi">Ort. puan</th>
                </tr>
              </thead>
              <tbody>
                {denemeler.map((deneme) => (
                  <tr key={deneme.id}>
                    <td>
                      <HizliLink href={`/panel/denemeler/${deneme.id}`} className="baglanti">
                        {deneme.ad}
                      </HizliLink>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {formatEtiketi(deneme.format)} · {tamSayi(deneme.toplamSoru)} soru
                      </p>
                    </td>
                    <td className="text-slate-600">{kisaTarih(deneme.tarih)}</td>
                    <td>
                      <Etiket ton="marka">{deneme.sinavTuru}</Etiket>
                    </td>
                    <td className="sayi text-slate-600">{tamSayi(deneme.katilim)}</td>
                    <td className="sayi font-semibold text-slate-900">{net(deneme.ortalamaNet)}</td>
                    <td className="sayi text-slate-600">{net(deneme.enYuksekNet)}</td>
                    <td className="sayi text-slate-600">{puan(deneme.ortalamaPuan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kart>
      )}
    </div>
  );
}
