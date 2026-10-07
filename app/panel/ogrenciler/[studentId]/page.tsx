import Link from "next/link";
import { notFound } from "next/navigation";
import { CizgiGrafik, DaireGrafik } from "@/components/grafikler/istemci";
import { GRAFIK_RENKLERI } from "@/components/grafikler/renkler";
import { HizliLink } from "@/components/HizliLink";
import { BosDurum, Kart } from "@/components/Kutu";
import { OlcutSerit, SayfaUstu } from "@/components/SayfaUstu";
import { RehberlikKarnesi } from "@/components/ogrenci/RehberlikKarnesi";
import { YazdirButonu } from "@/components/YazdirButonu";
import { VeliKarneButonu } from "@/components/veli/VeliKarneButonu";
import {
  grupKisaAdi,
  grupSiraNo,
  kazanimlariEslestir,
  ogrenciAnalizi,
} from "@/lib/analiz";
import { dersSiraNo, tekDenemeDersleri } from "@/lib/ders/kanonik";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { basariArkaPlani, kisaTarih, net, puan, tamSayi, yuzde } from "@/lib/format";
import { mevcutGrupSirasi, parseSinavTuru, sinavQuery } from "@/lib/sinav";
import { SinavTuruSecici } from "@/components/SinavTuruSecici";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ sinav?: string }>;
}) {
  const [{ studentId }, { sinav }] = await Promise.all([params, searchParams]);
  const { kurum } = await kurumOturumuGerekli();
  const analiz = await ogrenciAnalizi(studentId, kurum.id, parseSinavTuru(sinav));
  return { title: analiz?.ogrenci.adSoyad ?? "Öğrenci" };
}

export default async function OgrenciDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ durum?: string; tasinan?: string; sinav?: string }>;
}) {
  const [{ studentId }, { durum, tasinan, sinav }] = await Promise.all([params, searchParams]);
  const { kurum } = await kurumOturumuGerekli();
  const sinavTuru = parseSinavTuru(sinav);

  const analiz = await ogrenciAnalizi(studentId, kurum.id, sinavTuru);
  if (!analiz) notFound();

  const { ogrenci, sonuclar, kazanimSatirlari } = analiz;

  const baslik = (
    <SayfaUstu
      baslik={ogrenci.adSoyad}
      meta={[
        ogrenci.sinif,
        ogrenci.ogrenciNo && ogrenci.ogrenciNo !== "0" ? `No ${ogrenci.ogrenciNo}` : null,
        `${tamSayi(sonuclar.length)} ${sinavTuru} deneme`,
      ]
        .filter(Boolean)
        .join(" · ")}
      geri={{ yazi: "Öğrenciler", yol: `/panel/ogrenciler?${sinavQuery(sinavTuru)}` }}
    >
      <SinavTuruSecici deger={sinavTuru} yol={`/panel/ogrenciler/${ogrenci.id}`} />
      <Link href={`/panel/ogrenciler/${ogrenci.id}/duzenle`} className="btn btn-ikincil btn-kucuk">
        Kaydı düzenle
      </Link>
      <YazdirButonu dosyaAdi={`${ogrenci.adSoyad} ${sinavTuru} karnesi`} />
    </SayfaUstu>
  );

  if (sonuclar.length === 0) {
    return (
      <div className="space-y-4">
        {baslik}
        <DurumMesaji durum={durum} tasinan={tasinan} />
        <BosDurum
          baslik={`Bu öğrencinin ${sinavTuru} sonucu yok`}
          aciklama={`${sinavTuru} denemesi yüklendiğinde net ve kazanımlar burada görünür.`}
          baglantiYazisi="Deneme yükle"
          baglantiYolu="/panel/denemeler/yukle"
        />
      </div>
    );
  }

  const sonSonuc = sonuclar[sonuclar.length - 1];

  const netler = sonuclar.map((sonuc) => sonuc.toplamNet);
  const ortalamaNet = netler.reduce((toplam, deger) => toplam + deger, 0) / netler.length;

  const trendVerisi = sonuclar.map((sonuc) => ({
    etiket: kisaTarih(sonuc.exam.tarih),
    ogrenciNet: sonuc.toplamNet,
    kurumNet: sonuc.kurumOrtalamaNet,
    puan: sonuc.puan,
  }));

  const gruplar = mevcutGrupSirasi(
    sinavTuru,
    sonuclar.flatMap((sonuc) => sonuc.dersler.filter((ders) => ders.isGrup).map((ders) => ders.dersGrubu)),
  );

  const grupTrendVerisi = sonuclar.map((sonuc) => {
    const satir: Record<string, string | number | null> = {
      etiket: kisaTarih(sonuc.exam.tarih),
    };
    for (const grup of gruplar) {
      const ders = sonuc.dersler.find((d) => d.isGrup && d.dersGrubu === grup);
      satir[grup] = ders?.net ?? null;
    }
    return satir;
  });

  const eslesenKazanimlar = kazanimlariEslestir(kazanimSatirlari, sonuclar.length, sonSonuc.id);
  const surekliYanlislar = eslesenKazanimlar.filter((kazanim) => kazanim.herDenemedeYanlis);
  const yanlisKazanimlar = eslesenKazanimlar.filter((kazanim) => kazanim.yanlis > 0);
  const dersKazanimlari = kazanimlariDerslereAyir(yanlisKazanimlar);
  const dersToplamlari = dersleriTopla(sonuclar);
  const toplamlar = sonuclariTopla(sonuclar);
  const bolumToplamlari = bolumleriTopla(sonuclar);
  const cevapDilimleri = [
    { ad: "Doğru", deger: toplamlar.dogru, renk: GRAFIK_RENKLERI.yesil },
    { ad: "Yanlış", deger: toplamlar.yanlis, renk: GRAFIK_RENKLERI.kirmizi },
    { ad: "Boş", deger: toplamlar.bos, renk: GRAFIK_RENKLERI.gri },
  ];
  const bolumDilimleri = bolumToplamlari.map((grup) => ({
    ad: grupKisaAdi(grup.dersGrubu),
    deger: grup.dogru,
    renk: BOLUM_RENKLERI[grup.dersGrubu] ?? GRAFIK_RENKLERI.gri,
    not: `ort. net ${net(grup.net)}`,
  }));
  const konuDilimleri = konuDurumuDilimleri(eslesenKazanimlar);

  const denemeOzetleri = sonuclar.map((sonuc) => ({
    id: sonuc.id,
    ad: sonuc.exam.ad,
    tarih: sonuc.exam.tarih,
    toplamNet: sonuc.toplamNet,
    puan: sonuc.puan,
    toplamDogru: sonuc.toplamDogru,
    toplamYanlis: sonuc.toplamYanlis,
    toplamBos: sonuc.toplamBos,
    grupNetleri: Object.fromEntries(
      sonuc.dersler.filter((ders) => ders.isGrup).map((ders) => [ders.dersGrubu, ders.net]),
    ),
  }));
  const sonDersler = tekDenemeDersleri(sonSonuc.dersler);

  return (
    <div className="space-y-4">
      <div className="yazdirma-gizle space-y-4">
      {baslik}
      <DurumMesaji durum={durum} tasinan={tasinan} />

      <OlcutSerit
        ogeler={[
          { etiket: "Son net", deger: net(sonSonuc.toplamNet), not: sonSonuc.exam.ad },
          { etiket: "Ort. net", deger: net(ortalamaNet) },
          { etiket: "En yüksek", deger: net(Math.max(...netler)) },
          {
            etiket: sonSonuc.yuzdelikDilim !== null ? "Yüzdelik" : "Genel sıra",
            deger:
              sonSonuc.yuzdelikDilim !== null
                ? yuzde(sonSonuc.yuzdelikDilim)
                : sonSonuc.genelSira
                  ? tamSayi(sonSonuc.genelSira)
                  : "—",
          },
        ]}
      />

      <Kart baslik="Deneme geçmişi">
        <div className="overflow-x-auto">
          <table className="tablo">
            <thead>
              <tr>
                <th>Deneme</th>
                <th>Tarih</th>
                {gruplar.map((grup) => (
                  <th key={grup} className="sayi">
                    {grupKisaAdi(grup)}
                  </th>
                ))}
                <th className="sayi">D</th>
                <th className="sayi">Y</th>
                <th className="sayi">B</th>
                <th className="sayi">Net</th>
                <th className="sayi">Puan</th>
                <th className="sayi">Dilim / Sıra</th>
                <th className="yazdirma-gizle">Veli</th>
              </tr>
            </thead>
            <tbody>
              {[...sonuclar].reverse().map((sonuc) => {
                const grupNetleri = new Map(
                  sonuc.dersler.filter((d) => d.isGrup).map((d) => [d.dersGrubu, d.net]),
                );
                return (
                  <tr key={sonuc.id}>
                    <td>
                      <HizliLink href={`/panel/denemeler/${sonuc.exam.id}`} className="baglanti">
                        {sonuc.exam.ad}
                      </HizliLink>
                    </td>
                    <td className="text-slate-600">{kisaTarih(sonuc.exam.tarih)}</td>
                    {gruplar.map((grup) => (
                      <td key={grup} className="sayi text-slate-600">
                        {grupNetleri.has(grup) ? net(grupNetleri.get(grup)) : "—"}
                      </td>
                    ))}
                    <td className="sayi text-emerald-700">{tamSayi(sonuc.toplamDogru)}</td>
                    <td className="sayi text-rose-700">{tamSayi(sonuc.toplamYanlis)}</td>
                    <td className="sayi text-slate-500">{tamSayi(sonuc.toplamBos)}</td>
                    <td className="sayi font-semibold text-slate-900">{net(sonuc.toplamNet)}</td>
                    <td className="sayi text-slate-600">{puan(sonuc.puan)}</td>
                    <td className="sayi text-slate-500">
                      {sonuc.yuzdelikDilim !== null
                        ? yuzde(sonuc.yuzdelikDilim)
                        : sonuc.genelSira
                          ? tamSayi(sonuc.genelSira)
                          : "—"}
                    </td>
                    <td className="yazdirma-gizle">
                      <VeliKarneButonu studentId={ogrenci.id} examId={sonuc.exam.id} kisa />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Kart>

      <section className="space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Tüm denemeler</h2>
          <p className="text-[13px] text-slate-500">
            {tamSayi(sonuclar.length)} denemenin toplamı. Aynı kazanım denemeler arasında eşleştirildi.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Kart baslik="Cevap dağılımı" aciklama="Tüm denemeler">
            <DaireGrafik dilimler={cevapDilimleri} orta={net(ortalamaNet)} ortaAlt="ort. net" />
          </Kart>
          <Kart baslik="Bölüm payı" aciklama="Doğru cevapların bölümlere dağılımı">
            <DaireGrafik
              dilimler={bolumDilimleri}
              orta={tamSayi(toplamlar.dogru)}
              ortaAlt="doğru"
            />
          </Kart>
          <Kart baslik="Konu durumu" aciklama="Tüm denemelerdeki soru ağırlığı">
            <DaireGrafik
              dilimler={konuDilimleri}
              orta={tamSayi(konuDilimleri.reduce((toplam, dilim) => toplam + dilim.deger, 0))}
              ortaAlt="soru"
            />
          </Kart>
        </div>
        <p className="border border-cerceve bg-yuzey px-4 py-3 text-[13.5px] leading-relaxed text-slate-700">
          {tamSayi(toplamlar.soru)} sorunun {tamSayi(toplamlar.dogru)} tanesi doğru,{" "}
          {tamSayi(toplamlar.yanlis)} tanesi yanlış, {tamSayi(toplamlar.bos)} tanesi boş.
          {surekliYanlislar.length > 0
            ? ` ${tamSayi(surekliYanlislar.length)} kazanım, sorulduğu her denemede yanlış.`
            : " Sorulduğu her denemede yanlış olan kazanım yok."}
        </p>

        <Kart
          baslik="Her denemede yanlış"
          aciklama="Aynı kazanım, girdiği denemelerin tamamında yanlış"
        >
          {surekliYanlislar.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              Birden fazla denemede tekrarlayan tam yanlış yok.
            </p>
          ) : (
            <KazanimTablosu satirlar={surekliYanlislar} dersGoster />
          )}
        </Kart>

        <Kart baslik="Dersler" aciklama="Tüm denemelerin toplamı">
          <div className="overflow-x-auto">
            <table className="tablo">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th className="sayi">Deneme</th>
                  <th className="sayi">Soru</th>
                  <th className="sayi">D</th>
                  <th className="sayi">Y</th>
                  <th className="sayi">B</th>
                  <th className="sayi">Ort. net</th>
                  <th className="sayi">Başarı</th>
                </tr>
              </thead>
              <tbody>
                {dersToplamlari.map((ders) => (
                  <tr key={`${ders.dersGrubu}-${ders.dersAdi}`}>
                    <td>
                      <span className="font-medium text-slate-800">{ders.dersAdi}</span>
                      <span className="ml-2 text-[12px] text-slate-400">{grupKisaAdi(ders.dersGrubu)}</span>
                    </td>
                    <td className="sayi text-slate-500">{tamSayi(ders.denemeSayisi)}</td>
                    <td className="sayi text-slate-500">{tamSayi(ders.soru)}</td>
                    <td className="sayi text-emerald-700">{tamSayi(ders.dogru)}</td>
                    <td className="sayi text-rose-700">{tamSayi(ders.yanlis)}</td>
                    <td className="sayi text-slate-500">{tamSayi(ders.bos)}</td>
                    <td className="sayi font-semibold text-slate-900">{net(ders.net)}</td>
                    <td className="sayi">
                      <span
                        className={`tabular border px-1.5 py-px text-[13px] ${basariArkaPlani(
                          ders.basariYuzde,
                        )}`}
                      >
                        {yuzde(ders.basariYuzde)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kart>

        <h3 className="text-[15px] font-semibold text-slate-900">Yanlış kazanımlar</h3>
        {dersKazanimlari.length === 0 ? (
          <Kart>
            <p className="px-4 py-6 text-sm text-slate-500">Yanlış kazanım yok.</p>
          </Kart>
        ) : (
          dersKazanimlari.map((grup) => (
            <Kart
              key={`${grup.dersGrubu}-${grup.dersAdi}`}
              baslik={grup.dersAdi}
              aciklama={
                grup.dersAdi === grupKisaAdi(grup.dersGrubu) ? undefined : grupKisaAdi(grup.dersGrubu)
              }
            >
              <KazanimTablosu satirlar={grup.satirlar} />
            </Kart>
          ))
        )}
      </section>

      <Kart baslik="Net gelişimi">
        <div className="px-2 py-3">
          <CizgiGrafik
            veri={trendVerisi}
            seriler={[
              { anahtar: "ogrenciNet", ad: ogrenci.adSoyad, renk: GRAFIK_RENKLERI.marka },
              {
                anahtar: "kurumNet",
                ad: "Kurum ortalaması",
                renk: GRAFIK_RENKLERI.gri,
                kesikli: true,
              },
            ]}
          />
        </div>
      </Kart>

      <Kart baslik="Bölüm netleri">
        <div className="px-2 py-3">
          <CizgiGrafik
            veri={grupTrendVerisi}
            yukseklik={280}
            seriler={gruplar.map((grup, index) => ({
              anahtar: grup,
              ad: grupKisaAdi(grup),
              renk: BOLUM_RENKLERI[grup] ?? BOLUM_PALET[index % BOLUM_PALET.length],
            }))}
          />
        </div>
      </Kart>
      </div>

      <RehberlikKarnesi
        kurumAd={kurum.ad}
        sinavTuru={sinavTuru}
        ogrenci={ogrenci}
        denemeler={denemeOzetleri}
        sonDeneme={denemeOzetleri[denemeOzetleri.length - 1]}
        ortalamaNet={ortalamaNet}
        dersToplamlari={dersToplamlari}
        sonDersler={sonDersler}
        kazanimlar={eslesenKazanimlar}
      />
    </div>
  );
}

const BOLUM_RENKLERI: Record<string, string> = {
  "TYT Türkçe": GRAFIK_RENKLERI.marka,
  "TYT Sosyal": GRAFIK_RENKLERI.turkuaz,
  "TYT Matematik": GRAFIK_RENKLERI.turuncu,
  "TYT Fen": GRAFIK_RENKLERI.mor,
  "AYT Edebiyat": GRAFIK_RENKLERI.marka,
  "AYT Sosyal": GRAFIK_RENKLERI.turkuaz,
  "AYT Matematik": GRAFIK_RENKLERI.turuncu,
  "AYT Fen": GRAFIK_RENKLERI.mor,
};

const BOLUM_PALET = [
  GRAFIK_RENKLERI.marka,
  GRAFIK_RENKLERI.turkuaz,
  GRAFIK_RENKLERI.turuncu,
  GRAFIK_RENKLERI.mor,
  GRAFIK_RENKLERI.yesil,
  GRAFIK_RENKLERI.kirmizi,
];

function konuDurumuDilimleri(kazanimlar: { soru: number; basariYuzde: number | null }[]) {
  const bantlar = [
    { ad: "Zayıf", renk: GRAFIK_RENKLERI.kirmizi, soru: 0 },
    { ad: "Gelişmeli", renk: GRAFIK_RENKLERI.turuncu, soru: 0 },
    { ad: "Orta", renk: GRAFIK_RENKLERI.turkuaz, soru: 0 },
    { ad: "Güçlü", renk: GRAFIK_RENKLERI.yesil, soru: 0 },
  ];
  for (const kazanim of kazanimlar) {
    const basari = kazanim.basariYuzde ?? 0;
    const index = basari < 25 ? 0 : basari < 50 ? 1 : basari < 75 ? 2 : 3;
    bantlar[index].soru += kazanim.soru;
  }
  return bantlar.map((bant) => ({ ad: bant.ad, deger: bant.soru, renk: bant.renk }));
}

function sonuclariTopla(
  sonuclar: { toplamDogru: number; toplamYanlis: number; toplamBos: number; toplamSoru: number }[],
) {
  return sonuclar.reduce(
    (toplam, sonuc) => ({
      dogru: toplam.dogru + sonuc.toplamDogru,
      yanlis: toplam.yanlis + sonuc.toplamYanlis,
      bos: toplam.bos + sonuc.toplamBos,
      soru: toplam.soru + sonuc.toplamSoru,
    }),
    { dogru: 0, yanlis: 0, bos: 0, soru: 0 },
  );
}

function bolumleriTopla(
  sonuclar: {
    dersler: { isGrup: boolean; dersGrubu: string; dogru: number; net: number }[];
  }[],
) {
  const harita = new Map<string, { dersGrubu: string; dogru: number; net: number; adet: number }>();
  for (const sonuc of sonuclar) {
    for (const ders of sonuc.dersler) {
      if (!ders.isGrup) continue;
      const mevcut = harita.get(ders.dersGrubu) ?? {
        dersGrubu: ders.dersGrubu,
        dogru: 0,
        net: 0,
        adet: 0,
      };
      mevcut.dogru += ders.dogru;
      mevcut.net += ders.net;
      mevcut.adet += 1;
      harita.set(ders.dersGrubu, mevcut);
    }
  }
  return [...harita.values()]
    .map((grup) => ({ ...grup, net: grup.adet > 0 ? grup.net / grup.adet : 0 }))
    .sort((a, b) => grupSiraNo(a.dersGrubu) - grupSiraNo(b.dersGrubu));
}

function dersleriTopla(
  sonuclar: {
    dersler: {
      isGrup: boolean;
      dersAdi: string;
      dersGrubu: string;
      soru: number;
      dogru: number;
      yanlis: number;
      bos: number;
      net: number;
    }[];
  }[],
) {
  const harita = new Map<
    string,
    {
      dersAdi: string;
      dersGrubu: string;
      soru: number;
      dogru: number;
      yanlis: number;
      bos: number;
      net: number;
      denemeSayisi: number;
    }
  >();
  for (const sonuc of sonuclar) {
    const buDenemede = new Set<string>();
    for (const ders of tekDenemeDersleri(sonuc.dersler)) {
      const anahtar = ders.dersAdi;
      const mevcut = harita.get(anahtar) ?? {
        dersAdi: ders.dersAdi,
        dersGrubu: ders.dersGrubu,
        soru: 0,
        dogru: 0,
        yanlis: 0,
        bos: 0,
        net: 0,
        denemeSayisi: 0,
      };
      mevcut.soru += ders.soru;
      mevcut.dogru += ders.dogru;
      mevcut.yanlis += ders.yanlis;
      mevcut.bos += ders.bos;
      mevcut.net += ders.net;
      if (!buDenemede.has(anahtar)) {
        mevcut.denemeSayisi += 1;
        buDenemede.add(anahtar);
      }
      harita.set(anahtar, mevcut);
    }
  }
  return [...harita.values()]
    .map((ders) => ({
      ...ders,
      net: ders.denemeSayisi > 0 ? ders.net / ders.denemeSayisi : 0,
      basariYuzde: ders.soru > 0 ? (ders.dogru / ders.soru) * 100 : 0,
    }))
    .sort((a, b) => dersSiraNo(a.dersAdi) - dersSiraNo(b.dersAdi));
}

function kazanimlariDerslereAyir<
  T extends {
    dersAdi: string;
    dersGrubu: string;
    kazanim: string;
    soru: number;
    basariYuzde: number | null;
    herDenemedeYanlis?: boolean;
    yanlisDeneme?: number;
  },
>(satirlar: T[]) {
  const harita = new Map<string, { dersAdi: string; dersGrubu: string; satirlar: T[] }>();
  for (const satir of satirlar) {
    const anahtar = `${satir.dersGrubu}\0${satir.dersAdi}`;
    const mevcut = harita.get(anahtar);
    if (mevcut) mevcut.satirlar.push(satir);
    else harita.set(anahtar, { dersAdi: satir.dersAdi, dersGrubu: satir.dersGrubu, satirlar: [satir] });
  }

  return [...harita.values()]
    .map((grup) => ({
      ...grup,
      satirlar: [...grup.satirlar].sort(
        (a, b) =>
          Number(b.herDenemedeYanlis) - Number(a.herDenemedeYanlis) ||
          (b.yanlisDeneme ?? 0) - (a.yanlisDeneme ?? 0) ||
          (a.basariYuzde ?? 0) - (b.basariYuzde ?? 0) ||
          b.soru - a.soru ||
          a.kazanim.localeCompare(b.kazanim, "tr"),
      ),
    }))
    .sort(
      (a, b) =>
        dersSiraNo(a.dersAdi) - dersSiraNo(b.dersAdi) ||
        a.dersAdi.localeCompare(b.dersAdi, "tr"),
    );
}

function KazanimTablosu({
  satirlar,
  dersGoster = false,
}: {
  satirlar: {
    dersAdi: string;
    dersGrubu: string;
    kazanim: string;
    denemeSayisi: number;
    yanlisDeneme: number;
    herDenemedeYanlis: boolean;
    dogru: number;
    yanlis: number;
    basariYuzde: number | null;
  }[];
  dersGoster?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="tablo">
        <thead>
          <tr>
            {dersGoster ? <th>Ders</th> : null}
            <th>Kazanım</th>
            <th className="sayi">Deneme</th>
            <th className="sayi">D</th>
            <th className="sayi">Y</th>
            <th className="sayi">Başarı</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((kazanim) => (
            <tr key={`${kazanim.dersGrubu}-${kazanim.dersAdi}-${kazanim.kazanim}`}>
              {dersGoster ? (
                <td>
                  <span className="font-medium text-slate-800">{kazanim.dersAdi}</span>
                  <span className="ml-2 text-[12px] text-slate-400">{grupKisaAdi(kazanim.dersGrubu)}</span>
                </td>
              ) : null}
              <td className="text-[13.5px] text-slate-900">
                {kazanim.kazanim}
                {!dersGoster && kazanim.herDenemedeYanlis ? (
                  <span className="ml-2 border border-rose-200 bg-rose-50 px-1.5 py-px text-[11px] text-rose-700">
                    her denemede
                  </span>
                ) : null}
              </td>
              <td className="sayi text-slate-600">
                {tamSayi(kazanim.yanlisDeneme)}/{tamSayi(kazanim.denemeSayisi)}
              </td>
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
  );
}

function DurumMesaji({ durum, tasinan }: { durum?: string; tasinan?: string }) {
  if (durum !== "birlestirildi") return null;
  return (
    <p className="uyari-serit border-emerald-200 bg-emerald-50 text-emerald-800">
      Kayıtlar birleştirildi{tasinan ? `, ${tasinan} deneme sonucu bu öğrenciye taşındı` : ""}.
    </p>
  );
}
