import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DaireGrafik } from "@/components/grafikler/istemci";
import { GRAFIK_RENKLERI } from "@/components/grafikler/renkler";
import { Kart } from "@/components/Kutu";
import { HedeflyImza, Logo } from "@/components/Marka";
import { YazdirButonu } from "@/components/YazdirButonu";
import { grupKisaAdi } from "@/lib/analiz";
import { basariArkaPlani, net, puan, tamSayi, tarih, yuzde } from "@/lib/format";
import { veliKarnesiOku } from "@/lib/veli/karne";

export const metadata: Metadata = {
  title: "Veli karnesi",
  robots: { index: false, follow: false },
};

const BOLUM_RENKLERI: Record<string, string> = {
  "TYT Türkçe": GRAFIK_RENKLERI.marka,
  "TYT Sosyal": GRAFIK_RENKLERI.turkuaz,
  "TYT Matematik": GRAFIK_RENKLERI.turuncu,
  "TYT Fen": GRAFIK_RENKLERI.mor,
};

export default async function VeliKarneSayfasi({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const karne = await veliKarnesiOku(token);
  if (!karne) notFound();

  const { ogrenci, sinav, sonuc, gruplar, dersler, kazanimGruplari, kurumAd } = karne;
  const cevapDilimleri = [
    { ad: "Doğru", deger: sonuc.toplamDogru, renk: GRAFIK_RENKLERI.yesil },
    { ad: "Yanlış", deger: sonuc.toplamYanlis, renk: GRAFIK_RENKLERI.kirmizi },
    { ad: "Boş", deger: sonuc.toplamBos, renk: GRAFIK_RENKLERI.gri },
  ];
  const bolumDilimleri = gruplar.map((grup) => ({
    ad: grupKisaAdi(grup.dersGrubu),
    deger: grup.dogru,
    renk: BOLUM_RENKLERI[grup.dersGrubu] ?? GRAFIK_RENKLERI.gri,
    not: `net ${net(grup.net)}`,
  }));

  return (
    <div className="min-h-screen bg-zemin">
      <header className="border-b border-cerceve bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Logo boyut="sm" />
          <YazdirButonu yazi="Yazdır" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">{kurumAd}</p>
          <h1 className="mt-1 text-[22px] font-semibold text-slate-950">{ogrenci.adSoyad}</h1>
          <p className="mt-1 text-[13.5px] text-slate-600">
            {[ogrenci.sinif, sinav.sinavTuru].filter(Boolean).join(" · ")}
          </p>
        </div>

        <section className="border border-cerceve bg-yuzey px-4 py-3">
          <h2 className="text-[15px] font-semibold text-slate-900">{sinav.ad}</h2>
          <p className="text-[13px] text-slate-500">{tarih(sinav.tarih)}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Olcut etiket="Net" deger={net(sonuc.toplamNet)} />
            <Olcut etiket="Puan" deger={puan(sonuc.puan)} />
            <Olcut etiket="Doğru / Yanlış / Boş" deger={`${tamSayi(sonuc.toplamDogru)} / ${tamSayi(sonuc.toplamYanlis)} / ${tamSayi(sonuc.toplamBos)}`} />
            <Olcut
              etiket={sonuc.yuzdelikDilim !== null ? "Yüzdelik dilim" : "Genel sıra"}
              deger={
                sonuc.yuzdelikDilim !== null
                  ? yuzde(sonuc.yuzdelikDilim)
                  : sonuc.genelSira
                    ? tamSayi(sonuc.genelSira)
                    : "—"
              }
            />
          </dl>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Kart baslik="Cevap dağılımı">
            <DaireGrafik dilimler={cevapDilimleri} orta={net(sonuc.toplamNet)} ortaAlt="net" />
          </Kart>
          <Kart baslik="Bölüm payı">
            <DaireGrafik dilimler={bolumDilimleri} orta={tamSayi(sonuc.toplamDogru)} ortaAlt="doğru" />
          </Kart>
        </div>

        {gruplar.length > 0 ? (
          <Kart baslik="Bölümler">
            <SonucTablosu
              satirlar={gruplar.map((grup) => ({
                ad: grupKisaAdi(grup.dersGrubu),
                soru: grup.soru,
                dogru: grup.dogru,
                yanlis: grup.yanlis,
                bos: grup.bos,
                netDeger: grup.net,
                basari: grup.basariYuzde,
              }))}
            />
          </Kart>
        ) : null}

        <Kart baslik="Dersler">
          <SonucTablosu
            satirlar={dersler.map((ders) => ({
              ad: ders.dersAdi,
              alt: grupKisaAdi(ders.dersGrubu),
              soru: ders.soru,
              dogru: ders.dogru,
              yanlis: ders.yanlis,
              bos: ders.bos,
              netDeger: ders.net,
              basari: ders.basariYuzde,
              sinif: ders.sinifOrt,
              kurum: ders.kurumOrt,
            }))}
            ortalama
          />
        </Kart>

        {kazanimGruplari.map((grup) => (
          <Kart
            key={`${grup.dersGrubu}-${grup.dersAdi}`}
            baslik={grup.dersAdi}
            aciklama={grup.dersAdi === grupKisaAdi(grup.dersGrubu) ? undefined : grupKisaAdi(grup.dersGrubu)}
          >
            <div className="overflow-x-auto">
              <table className="tablo">
                <thead>
                  <tr>
                    <th>Kazanım</th>
                    <th className="sayi">Soru</th>
                    <th className="sayi">D</th>
                    <th className="sayi">Y</th>
                    <th className="sayi">Başarı</th>
                  </tr>
                </thead>
                <tbody>
                  {grup.satirlar.map((kazanim) => (
                    <tr key={kazanim.kazanim}>
                      <td className="text-[13.5px] text-slate-900">{kazanim.kazanim}</td>
                      <td className="sayi text-slate-500">{tamSayi(kazanim.soru)}</td>
                      <td className="sayi text-emerald-700">{tamSayi(kazanim.dogru)}</td>
                      <td className="sayi text-rose-700">{tamSayi(kazanim.yanlis)}</td>
                      <td className="sayi">
                        <span
                          className={`tabular border px-1.5 py-px text-[13px] ${basariArkaPlani(
                            kazanim.basariYuzde,
                          )}`}
                        >
                          {yuzde(kazanim.basariYuzde)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kart>
        ))}

        <p className="text-[13px] leading-relaxed text-slate-500">
          Bu sayfa yalnızca {ogrenci.adSoyad} adlı öğrencinin {sinav.ad} sonucunu gösterir. Başka bir
          öğrencinin veya denemenin bilgisi bu bağlantıda yoktur.
        </p>
        <HedeflyImza />
      </main>
    </div>
  );
}

function Olcut({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div>
      <dt className="text-[12px] text-slate-500">{etiket}</dt>
      <dd className="tabular mt-0.5 text-[15px] font-semibold text-slate-900">{deger}</dd>
    </div>
  );
}

function SonucTablosu({
  satirlar,
  ortalama = false,
}: {
  satirlar: Array<{
    ad: string;
    alt?: string;
    soru: number;
    dogru: number;
    yanlis: number;
    bos: number;
    netDeger: number;
    basari: number | null;
    sinif?: number | null;
    kurum?: number | null;
  }>;
  ortalama?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="tablo">
        <thead>
          <tr>
            <th>Ders</th>
            <th className="sayi">D</th>
            <th className="sayi">Y</th>
            <th className="sayi">B</th>
            <th className="sayi">Net</th>
            <th className="sayi">Başarı</th>
            {ortalama ? (
              <>
                <th className="sayi">Sınıf</th>
                <th className="sayi">Kurum</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((satir) => (
            <tr key={`${satir.alt ?? ""}-${satir.ad}`}>
              <td>
                <span className="font-medium text-slate-800">{satir.ad}</span>
                {satir.alt && satir.alt !== satir.ad ? (
                  <span className="ml-2 text-[12px] text-slate-400">{satir.alt}</span>
                ) : null}
              </td>
              <td className="sayi text-emerald-700">{tamSayi(satir.dogru)}</td>
              <td className="sayi text-rose-700">{tamSayi(satir.yanlis)}</td>
              <td className="sayi text-slate-500">{tamSayi(satir.bos)}</td>
              <td className="sayi font-semibold text-slate-900">{net(satir.netDeger)}</td>
              <td className="sayi">
                <span className={`tabular border px-1.5 py-px text-[13px] ${basariArkaPlani(satir.basari)}`}>
                  {yuzde(satir.basari)}
                </span>
              </td>
              {ortalama ? (
                <>
                  <td className="sayi text-slate-500">{net(satir.sinif)}</td>
                  <td className="sayi text-slate-500">{net(satir.kurum)}</td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
