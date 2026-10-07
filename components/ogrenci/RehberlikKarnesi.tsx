import { Logo } from "@/components/Marka";
import {
  kazanimGelisimDurumu,
  type EslesenKazanim,
} from "@/lib/analiz";
import { dersSiraNo } from "@/lib/ders/kanonik";
import { kisaTarih, net, tamSayi } from "@/lib/format";

type DersToplam = {
  dersAdi: string;
  dersGrubu: string;
  net: number;
  basariYuzde: number;
};

type SonDers = {
  dersAdi: string;
  dersGrubu: string;
  net: number;
  dogru: number;
  yanlis: number;
  bos: number;
};

type DenemeOzet = {
  id: string;
  ad: string;
  tarih: Date | string;
  toplamNet: number;
  puan: number | null;
  toplamDogru: number;
  toplamYanlis: number;
  toplamBos: number;
  grupNetleri: Partial<Record<string, number | null>>;
};

function konulariDerslereAyir(satirlar: EslesenKazanim[]) {
  const harita = new Map<string, EslesenKazanim[]>();
  for (const satir of satirlar) {
    const liste = harita.get(satir.dersAdi) ?? [];
    liste.push(satir);
    harita.set(satir.dersAdi, liste);
  }
  return [...harita.entries()]
    .map(([dersAdi, konular]) => ({
      dersAdi,
      konular: konular.sort((a, b) => a.kazanim.localeCompare(b.kazanim, "tr")),
    }))
    .sort((a, b) => dersSiraNo(a.dersAdi) - dersSiraNo(b.dersAdi));
}

function KonuListesi({
  baslik,
  renk,
  satirlar,
  bosYazi,
}: {
  baslik: string;
  renk: "rose" | "amber" | "emerald";
  satirlar: EslesenKazanim[];
  bosYazi: string;
}) {
  const kutu = {
    rose: "border-rose-200 bg-rose-50",
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
  }[renk];
  const baslikRenk = {
    rose: "text-rose-800",
    amber: "text-amber-900",
    emerald: "text-emerald-800",
  }[renk];
  const nokta = {
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
  }[renk];

  return (
    <section className={`karne-renk break-inside-avoid rounded-lg border ${kutu} p-3`}>
      <h2 className={`text-[13px] font-semibold ${baslikRenk}`}>
        {baslik}
        <span className="ml-1.5 font-medium text-slate-500">{tamSayi(satirlar.length)}</span>
      </h2>
      {satirlar.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-slate-600">{bosYazi}</p>
      ) : (
        <div className="mt-2 space-y-2">
          {konulariDerslereAyir(satirlar).map((grup) => (
            <div key={grup.dersAdi}>
              <p className="text-[11.5px] font-semibold text-slate-700">{grup.dersAdi}</p>
              <ul className="mt-0.5 space-y-0.5">
                {grup.konular.map((konu) => (
                  <li
                    key={`${konu.dersGrubu}-${konu.kazanim}`}
                    className="flex items-start gap-1.5 text-[12.5px] text-slate-800"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${nokta}`} />
                    <span>
                      {konu.kazanim}
                      <span className="ml-1 text-[11px] text-slate-500">
                        {tamSayi(konu.yanlisDeneme)}/{tamSayi(konu.denemeSayisi)} deneme
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function RehberlikKarnesi({
  kurumAd,
  ogrenci,
  denemeler,
  sonDeneme,
  ortalamaNet,
  dersToplamlari,
  sonDersler,
  kazanimlar,
}: {
  kurumAd: string;
  ogrenci: { adSoyad: string; sinif: string | null; ogrenciNo: string | null };
  denemeler: DenemeOzet[];
  sonDeneme: DenemeOzet;
  ortalamaNet: number;
  dersToplamlari: DersToplam[];
  sonDersler: SonDers[];
  kazanimlar: EslesenKazanim[];
}) {
  const karsilastirma = kazanimlar.map((kazanim) => ({
    kazanim,
    durum: kazanimGelisimDurumu(kazanim),
  }));
  const hala = karsilastirma.filter((s) => s.durum === "hala").map((s) => s.kazanim);
  const duzeldi = karsilastirma.filter((s) => s.durum === "duzeldi").map((s) => s.kazanim);
  const yeni = karsilastirma.filter((s) => s.durum === "yeni").map((s) => s.kazanim);
  const calis = [...hala, ...yeni];
  const sonOrtFark = sonDeneme.toplamNet - ortalamaNet;

  const dersSatirlari = dersToplamlari
    .map((ders) => {
      const son = sonDersler.find((aday) => aday.dersAdi === ders.dersAdi);
      return { ...ders, son, fark: son ? son.net - ders.net : null };
    })
    .sort((a, b) => dersSiraNo(a.dersAdi) - dersSiraNo(b.dersAdi));

  const kimlik = [
    ogrenci.sinif,
    ogrenci.ogrenciNo && ogrenci.ogrenciNo !== "0" ? `No ${ogrenci.ogrenciNo}` : null,
    `${tamSayi(denemeler.length)} deneme`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="ekran-disi text-slate-800">
      <header className="flex items-center justify-between gap-4 rounded-lg bg-slate-900 px-4 py-3 text-white">
        <div>
          <Logo boyut="sm" ton="acik" />
          <p className="mt-1 text-[12px] text-slate-300">TYT karnesi</p>
        </div>
        <div className="text-right text-[12px] text-slate-300">
          <p className="font-medium text-white">{kurumAd}</p>
          <p>{kisaTarih(new Date())}</p>
        </div>
      </header>

      <section className="mt-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-950">{ogrenci.adSoyad}</h1>
        <p className="mt-1 text-[13px] text-slate-600">{kimlik}</p>
        <p className="mt-0.5 text-[13px] text-slate-600">
          Son deneme: {sonDeneme.ad} · {kisaTarih(sonDeneme.tarih)}
        </p>
      </section>

      <dl className="mt-4 grid grid-cols-4 gap-2">
        <div className="karne-renk rounded-lg border border-slate-200 px-3 py-2.5">
          <dt className="text-[11px] text-slate-500">Son net</dt>
          <dd className="mt-1 text-[22px] font-semibold tracking-tight text-slate-950">{net(sonDeneme.toplamNet)}</dd>
          <p className={`text-[11.5px] ${sonOrtFark >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {sonOrtFark >= 0 ? "Ortalamanın üstünde" : "Ortalamanın altında"} {net(Math.abs(sonOrtFark))}
          </p>
        </div>
        <div className="karne-renk rounded-lg border border-slate-200 px-3 py-2.5">
          <dt className="text-[11px] text-slate-500">Ortalama net</dt>
          <dd className="mt-1 text-[22px] font-semibold tracking-tight text-slate-950">{net(ortalamaNet)}</dd>
          <p className="text-[11.5px] text-slate-500">Tüm denemeler</p>
        </div>
        <div className="karne-renk rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
          <dt className="text-[11px] text-rose-700">Çalışılacak</dt>
          <dd className="mt-1 text-[22px] font-semibold tracking-tight text-rose-800">{tamSayi(calis.length)}</dd>
          <p className="text-[11.5px] text-rose-700/80">Konu</p>
        </div>
        <div className="karne-renk rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <dt className="text-[11px] text-emerald-700">Düzeldi</dt>
          <dd className="mt-1 text-[22px] font-semibold tracking-tight text-emerald-800">{tamSayi(duzeldi.length)}</dd>
          <p className="text-[11.5px] text-emerald-700/80">Konu</p>
        </div>
      </dl>

      <section className="mt-4 break-inside-avoid">
        <h2 className="text-[13px] font-semibold text-slate-950">Dersler</h2>
        <p className="text-[12px] text-slate-500">Soldaki ortalama, sağdaki son deneme.</p>
        <ul className="mt-2 space-y-1.5">
          {dersSatirlari.map((ders) => {
            const sonNet = ders.son?.net;
            const yukseldi = ders.fark !== null && ders.fark >= 0;
            return (
              <li key={ders.dersAdi} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-[12.5px]">
                <span className="font-medium text-slate-900">{ders.dersAdi}</span>
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-10 text-right tabular">{net(ders.net)}</span>
                  <span className="text-slate-300">→</span>
                  <span className="w-10 tabular font-semibold text-slate-950">
                    {sonNet === undefined ? "—" : net(sonNet)}
                  </span>
                </span>
                <span
                  className={`w-14 text-right tabular ${
                    ders.fark === null ? "text-slate-400" : yukseldi ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {ders.fark === null ? "" : `${yukseldi ? "+" : "−"}${net(Math.abs(ders.fark))}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <KonuListesi
          baslik="Çalışman gerekenler"
          renk="rose"
          satirlar={hala}
          bosYazi="Önceki denemelerden kalan açık konu yok."
        />
        <KonuListesi
          baslik="Bu denemede yeni eksi"
          renk="amber"
          satirlar={yeni}
          bosYazi="Bu denemede yeni tam yanlış konu yok."
        />
      </div>

      <div className="mt-3">
        <KonuListesi
          baslik="Düzelenler"
          renk="emerald"
          satirlar={duzeldi}
          bosYazi="Henüz düzelen konu yok."
        />
      </div>

      <section className="mt-4 break-inside-avoid">
        <h2 className="text-[13px] font-semibold text-slate-950">Denemeler</h2>
        <table className="mt-1 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-1.5 font-medium">Deneme</th>
              <th className="py-1.5 font-medium">Tarih</th>
              <th className="py-1.5 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {[...denemeler].reverse().map((deneme) => (
              <tr key={deneme.id} className="border-b border-slate-100">
                <td className="py-1.5 font-medium text-slate-900">{deneme.ad}</td>
                <td className="py-1.5 text-slate-600">{kisaTarih(deneme.tarih)}</td>
                <td className="py-1.5 text-right font-semibold tabular">{net(deneme.toplamNet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}
