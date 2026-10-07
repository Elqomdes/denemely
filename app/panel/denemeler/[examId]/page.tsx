import Link from "next/link";
import { notFound } from "next/navigation";
import { SutunGrafik } from "@/components/grafikler/istemci";
import { GRAFIK_RENKLERI } from "@/components/grafikler/renkler";
import { HizliLink } from "@/components/HizliLink";
import { Kart } from "@/components/Kutu";
import { OlcutSerit, SayfaUstu } from "@/components/SayfaUstu";
import { SilButonu } from "@/components/SilButonu";
import { denemeDetayi, grupKisaAdi } from "@/lib/analiz";
import { mevcutGrupSirasi, parseSinavTuru } from "@/lib/sinav";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { basariArkaPlani, net, puan, tamSayi, tarih, yuzde } from "@/lib/format";
import { formatEtiketi } from "@/lib/pdf/types";
import { denemeSil } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { kurum } = await kurumOturumuGerekli();
  const detay = await denemeDetayi(examId, kurum.id);
  return { title: detay?.deneme.ad ?? "Deneme" };
}

export default async function DenemeDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ durum?: string }>;
}) {
  const [{ examId }, { durum }] = await Promise.all([params, searchParams]);
  const { kurum } = await kurumOturumuGerekli();

  const detay = await denemeDetayi(examId, kurum.id);
  if (!detay) notFound();

  const { deneme, sonuclar, gruplar, dersler, zayifKazanimlar } = detay;
  const sinavTuru = parseSinavTuru(deneme.sinavTuru);
  const grupSirasi = mevcutGrupSirasi(
    sinavTuru,
    gruplar.map((grup) => grup.dersGrubu),
  );

  const netler = sonuclar.map((sonuc) => sonuc.toplamNet);
  const ortalamaNet =
    netler.length > 0 ? netler.reduce((toplam, deger) => toplam + deger, 0) / netler.length : null;
  const puanlar = sonuclar.map((sonuc) => sonuc.puan).filter((p): p is number => p !== null);
  const ortalamaPuan =
    puanlar.length > 0
      ? puanlar.reduce((toplam, deger) => toplam + deger, 0) / puanlar.length
      : null;

  const grupVerisi = gruplar.map((grup) => ({
    etiket: grupKisaAdi(grup.dersGrubu),
    ortalamaNet: grup.ortalamaNet,
    enYuksekNet: grup.enYuksekNet,
  }));

  return (
    <div className="space-y-4">
      <SayfaUstu
        baslik={deneme.ad}
        meta={`${sinavTuru} · ${tarih(deneme.tarih)} · ${formatEtiketi(deneme.format)}${deneme.yukleyen ? ` · ${deneme.yukleyen.adSoyad}` : ""}`}
        geri={{ yazi: "Denemeler", yol: `/panel/denemeler?sinav=${sinavTuru}` }}
      >
        <Link href={`/panel/denemeler/${deneme.id}/sorular`} className="btn btn-birincil btn-kucuk">
          Soru analizi
        </Link>
        <SilButonu
          action={denemeSil}
          gizliAlanAdi="examId"
          gizliDeger={deneme.id}
          onayMesaji={`"${deneme.ad}" denemesi ve ${sonuclar.length} öğrenci sonucu silinecek. Onaylıyor musunuz?`}
          yazi="Sil"
        />
      </SayfaUstu>

      {durum === "kaydedildi" ? (
        <p className="uyari-serit border-emerald-200 bg-emerald-50 text-emerald-800">
          Sonuçlar kaydedildi. {tamSayi(sonuclar.length)} öğrencinin analizi hazır.
        </p>
      ) : null}

      <OlcutSerit
        ogeler={[
          { etiket: "Katılım", deger: tamSayi(sonuclar.length) },
          { etiket: "Ort. net", deger: net(ortalamaNet) },
          {
            etiket: "En yüksek",
            deger: net(netler.length > 0 ? Math.max(...netler) : null),
            not: sonuclar[0]?.student.adSoyad,
          },
          { etiket: "Ort. puan", deger: puan(ortalamaPuan) },
        ]}
      />

      <Kart baslik="Öğrenci sıralaması">
        <div className="overflow-x-auto">
          <table className="tablo">
            <thead>
              <tr>
                <th className="sayi">#</th>
                <th>Öğrenci</th>
                <th>Sınıf</th>
                {grupSirasi.map((grup) => (
                  <th key={grup} className="sayi">
                    {grupKisaAdi(grup)}
                  </th>
                ))}
                <th className="sayi">Net</th>
                <th className="sayi">Puan</th>
                <th className="sayi">Genel sıra</th>
              </tr>
            </thead>
            <tbody>
              {sonuclar.map((sonuc, index) => {
                const grupNetleri = new Map(sonuc.dersler.map((ders) => [ders.dersGrubu, ders.net]));
                return (
                  <tr key={sonuc.id}>
                    <td className="sayi text-slate-400">{index + 1}</td>
                    <td>
                      <HizliLink
                        href={`/panel/ogrenciler/${sonuc.student.id}?sinav=${sinavTuru}`}
                        className="baglanti"
                      >
                        {sonuc.student.adSoyad}
                      </HizliLink>
                    </td>
                    <td className="text-slate-600">{sonuc.student.sinif ?? "—"}</td>
                    {grupSirasi.map((grup) => (
                      <td key={grup} className="sayi text-slate-600">
                        {grupNetleri.has(grup) ? net(grupNetleri.get(grup)) : "—"}
                      </td>
                    ))}
                    <td className="sayi font-semibold text-slate-900">{net(sonuc.toplamNet)}</td>
                    <td className="sayi text-slate-600">{puan(sonuc.puan)}</td>
                    <td className="sayi text-slate-500">
                      {sonuc.genelSira ? tamSayi(sonuc.genelSira) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Kart>

      <div className="grid gap-4 lg:grid-cols-2">
        <Kart baslik="Ders ortalamaları">
          <div className="overflow-x-auto">
            <table className="tablo">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th>Bölüm</th>
                  <th className="sayi">Ort. net</th>
                  <th className="sayi">Başarı</th>
                </tr>
              </thead>
              <tbody>
                {dersler.map((ders) => (
                  <tr key={`${ders.dersGrubu}-${ders.dersAdi}`}>
                    <td className="font-medium text-slate-800">{ders.dersAdi}</td>
                    <td className="text-slate-500">{grupKisaAdi(ders.dersGrubu)}</td>
                    <td className="sayi text-slate-900">{net(ders.ortalamaNet)}</td>
                    <td className="sayi">
                      <span
                        className={`tabular border px-1.5 py-px text-[13px] ${basariArkaPlani(
                          ders.ortalamaBasari,
                        )}`}
                      >
                        {yuzde(ders.ortalamaBasari)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kart>

        <Kart baslik="Zayıf kazanımlar">
          <ul>
            {zayifKazanimlar.map((kazanim) => (
              <li
                key={`${kazanim.dersAdi}-${kazanim.kazanim}`}
                className="flex items-center justify-between gap-3 border-b border-cerceve-soluk px-4 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] text-slate-900">{kazanim.kazanim}</p>
                  <p className="text-[12px] text-slate-500">
                    {kazanim.dersAdi} · {tamSayi(kazanim.soru)} soru
                  </p>
                </div>
                <span
                  className={`tabular shrink-0 border px-1.5 py-px text-[13px] ${basariArkaPlani(
                    kazanim.basariYuzde,
                  )}`}
                >
                  {yuzde(kazanim.basariYuzde)}
                </span>
              </li>
            ))}
          </ul>
        </Kart>
      </div>

      {gruplar.length > 0 ? (
        <Kart baslik="Bölüm netleri">
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="px-2 py-3 lg:col-span-3">
              <SutunGrafik
                veri={grupVerisi}
                seriler={[
                  { anahtar: "ortalamaNet", ad: "Ortalama net", renk: GRAFIK_RENKLERI.marka },
                  { anahtar: "enYuksekNet", ad: "En yüksek net", renk: GRAFIK_RENKLERI.gri },
                ]}
              />
            </div>
            <table className="tablo lg:col-span-2">
              <thead>
                <tr>
                  <th>Bölüm</th>
                  <th className="sayi">Ort. net</th>
                  <th className="sayi">Başarı</th>
                </tr>
              </thead>
              <tbody>
                {gruplar.map((grup) => (
                  <tr key={grup.dersGrubu}>
                    <td className="font-medium text-slate-800">{grupKisaAdi(grup.dersGrubu)}</td>
                    <td className="sayi text-slate-900">{net(grup.ortalamaNet)}</td>
                    <td className="sayi">
                      <span
                        className={`tabular border px-1.5 py-px text-[13px] ${basariArkaPlani(
                          grup.ortalamaBasari,
                        )}`}
                      >
                        {yuzde(grup.ortalamaBasari)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kart>
      ) : null}
    </div>
  );
}
