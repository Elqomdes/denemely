import { Logo } from "@/components/Marka";
import { kazanimGelisimDurumu, type EslesenKazanim } from "@/lib/analiz";
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

function NetGelisimCizgisi({ denemeler }: { denemeler: DenemeOzet[] }) {
  if (denemeler.length < 2) {
    return (
      <p className="mt-2 text-[13px] text-slate-600">
        Grafik için en az iki deneme gerekir. Şu an {tamSayi(denemeler.length)} denemen var.
      </p>
    );
  }

  const netler = denemeler.map((deneme) => deneme.toplamNet);
  const min = Math.min(...netler);
  const max = Math.max(...netler);
  const pay = max === min ? 5 : (max - min) * 0.18;
  const alt = min - pay;
  const ust = max + pay;
  const genislik = 640;
  const yukseklik = 168;
  const sol = 40;
  const sag = 12;
  const ustBosluk = 16;
  const altBosluk = 30;
  const icGenislik = genislik - sol - sag;
  const icYukseklik = yukseklik - ustBosluk - altBosluk;
  const x = (index: number) => sol + (index / (denemeler.length - 1)) * icGenislik;
  const y = (deger: number) =>
    ustBosluk + icYukseklik - ((deger - alt) / (ust - alt)) * icYukseklik;
  const yol = denemeler
    .map((deneme, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(deneme.toplamNet).toFixed(1)}`)
    .join(" ");
  const araCizgiler = [0.25, 0.5, 0.75].map((oran) => ustBosluk + icYukseklik * (1 - oran));

  return (
    <svg
      viewBox={`0 0 ${genislik} ${yukseklik}`}
      className="karne-renk mt-2 w-full"
      role="img"
      aria-label="İlk denemeden son denemeye net çizgisi"
    >
      <line
        x1={sol}
        y1={ustBosluk + icYukseklik}
        x2={sol + icGenislik}
        y2={ustBosluk + icYukseklik}
        stroke="#e2e8f0"
      />
      {araCizgiler.map((cy) => (
        <line key={cy} x1={sol} y1={cy} x2={sol + icGenislik} y2={cy} stroke="#f1f5f9" />
      ))}
      <text x={sol - 6} y={y(ust) + 3} textAnchor="end" className="fill-slate-400" fontSize="10">
        {net(ust)}
      </text>
      <text x={sol - 6} y={y(alt) + 3} textAnchor="end" className="fill-slate-400" fontSize="10">
        {net(alt)}
      </text>
      <path d={yol} fill="none" stroke="#4f46e5" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {denemeler.map((deneme, index) => {
        const seyrek = denemeler.length > 7;
        const etiketGoster =
          !seyrek || index === 0 || index === denemeler.length - 1 || index % Math.ceil(denemeler.length / 5) === 0;
        return (
          <g key={deneme.id}>
            <circle cx={x(index)} cy={y(deneme.toplamNet)} r="3.5" fill="#4f46e5" stroke="#fff" strokeWidth="1.5" />
            {etiketGoster ? (
              <>
                <text
                  x={x(index)}
                  y={y(deneme.toplamNet) - 8}
                  textAnchor="middle"
                  className="fill-slate-800"
                  fontSize="10"
                  fontWeight="600"
                >
                  {net(deneme.toplamNet)}
                </text>
                <text
                  x={x(index)}
                  y={yukseklik - 8}
                  textAnchor="middle"
                  className="fill-slate-500"
                  fontSize="10"
                >
                  {kisaTarih(deneme.tarih)}
                </text>
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function oncekiYazi(konu: EslesenKazanim) {
  if (konu.oncekiYanlisDeneme <= 0) return "Önceki denemelerde yok";
  return `Önceki: ${tamSayi(konu.oncekiYanlisDeneme)} denemede yanlış`;
}

function sonYazi(konu: EslesenKazanim) {
  if (!konu.sonDenemedeVar) return "Son denemede yok";
  if (konu.sonDenemedeYanlis) return "Son deneme: yanlış";
  return "Son deneme: düzeldi";
}

function KonuKutusu({
  baslik,
  aciklama,
  renk,
  satirlar,
  bosYazi,
}: {
  baslik: string;
  aciklama: string;
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
    amber: "text-amber-950",
    emerald: "text-emerald-800",
  }[renk];
  const serit = {
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
  }[renk];

  return (
    <section className={`karne-renk break-inside-avoid overflow-hidden rounded-lg border ${kutu}`}>
      <div className={`h-1 ${serit}`} />
      <div className="p-3">
        <h2 className={`text-[14px] font-semibold ${baslikRenk}`}>{baslik}</h2>
        <p className="mt-1 text-[12px] leading-5 text-slate-600">{aciklama}</p>
        {satirlar.length === 0 ? (
          <p className="mt-3 text-[13px] text-slate-600">{bosYazi}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {konulariDerslereAyir(satirlar).map((grup) => (
              <div key={grup.dersAdi}>
                <p className="text-[12px] font-semibold text-slate-800">{grup.dersAdi}</p>
                <ul className="mt-1 divide-y divide-black/5">
                  {grup.konular.map((konu) => (
                    <li key={`${konu.dersGrubu}-${konu.kazanim}`} className="py-1.5">
                      <p className="text-[13px] font-medium text-slate-950">{konu.kazanim}</p>
                      <p className="mt-0.5 text-[12px] text-slate-600">
                        {oncekiYazi(konu)}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {sonYazi(konu)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function RehberlikKarnesi({
  kurumAd,
  sinavTuru = "TYT",
  ogrenci,
  denemeler,
  sonDeneme,
  ortalamaNet,
  dersToplamlari,
  sonDersler,
  kazanimlar,
}: {
  kurumAd: string;
  sinavTuru?: string;
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
  const sonOrtFark = sonDeneme.toplamNet - ortalamaNet;
  const netYukseldi = sonOrtFark >= 0;

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

  const yapilacak: string[] = [];
  if (hala.length > 0) {
    yapilacak.push(
      `Kırmızı listedeki ${tamSayi(hala.length)} konuyu önce çalış. Bunları hem önceki denemelerde hem son denemede yanlış yaptın.`,
    );
  }
  if (yeni.length > 0) {
    yapilacak.push(
      `Sarı listedeki ${tamSayi(yeni.length)} konu bu denemede ilk kez tamamen yanlış. Unutma.`,
    );
  }
  if (duzeldi.length > 0) {
    yapilacak.push(
      `Yeşil listedeki ${tamSayi(duzeldi.length)} konu düzeldi. Bunları bırakma.`,
    );
  }
  if (yapilacak.length === 0) {
    yapilacak.push("Tekrarlayan tam yanlış konu yok. Netini artırmak için boş bıraktığın soruları azalt.");
  }

  return (
    <article className="ekran-disi text-slate-800">
      <header className="karne-renk flex items-center justify-between gap-4 rounded-lg bg-slate-900 px-4 py-3 text-white">
        <div>
          <Logo boyut="sm" ton="acik" />
          <p className="mt-1 text-[12px] text-slate-300">{sinavTuru} gelişim karnesi</p>
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
          Bu kâğıt son denemeni önceki denemelerinle karşılaştırır: {sonDeneme.ad} · {kisaTarih(sonDeneme.tarih)}
        </p>
      </section>

      <section className="karne-renk mt-4 grid grid-cols-3 gap-2 text-[12px] leading-5">
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900">
          <span className="font-semibold">Kırmızı:</span> daha önce de yanlış, son denemede de yanlış. Önce bunlara çalış.
        </p>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
          <span className="font-semibold">Sarı:</span> bu denemede ilk kez tamamen yanlış. Yeni eksi.
        </p>
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
          <span className="font-semibold">Yeşil:</span> önceki denemelerde yanlıştı, son denemede düzeldi.
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="karne-renk rounded-lg border border-slate-200 px-4 py-3">
          <p className="text-[12px] text-slate-500">Son denemenin neti</p>
          <p className="mt-1 text-[28px] font-semibold tracking-tight text-slate-950">{net(sonDeneme.toplamNet)}</p>
          <p className={`mt-1 text-[13px] ${netYukseldi ? "text-emerald-700" : "text-rose-700"}`}>
            {netYukseldi
              ? `Ortalamandan ${net(sonOrtFark)} net daha iyi`
              : `Ortalamanın ${net(Math.abs(sonOrtFark))} net gerisinde`}
          </p>
        </div>
        <div className="karne-renk rounded-lg border border-slate-200 px-4 py-3">
          <p className="text-[12px] text-slate-500">Tüm denemelerinin ortalaması</p>
          <p className="mt-1 text-[28px] font-semibold tracking-tight text-slate-950">{net(ortalamaNet)}</p>
          <p className="mt-1 text-[13px] text-slate-500">{tamSayi(denemeler.length)} denemenin ortalaması</p>
        </div>
      </section>

      <section className="mt-4 break-inside-avoid">
        <h2 className="text-[14px] font-semibold text-slate-950">Ders netlerin değişti mi?</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Soldaki senin ortalaman, sağdaki son denemen. Yeşil yükseldi, kırmızı düştü.
        </p>
        <table className="mt-2 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[12px] text-slate-500">
              <th className="py-1.5 font-medium">Ders</th>
              <th className="py-1.5 text-right font-medium">Ortalaman</th>
              <th className="py-1.5 text-right font-medium">Son denemen</th>
              <th className="py-1.5 text-right font-medium">Fark</th>
            </tr>
          </thead>
          <tbody>
            {dersSatirlari.map((ders) => {
              const yukseldi = ders.fark !== null && ders.fark >= 0;
              return (
                <tr key={ders.dersAdi} className="border-b border-slate-100">
                  <td className="py-1.5 font-medium text-slate-900">{ders.dersAdi}</td>
                  <td className="py-1.5 text-right tabular text-slate-600">{net(ders.net)}</td>
                  <td className="py-1.5 text-right tabular font-semibold text-slate-950">
                    {ders.son ? net(ders.son.net) : "—"}
                  </td>
                  <td
                    className={`py-1.5 text-right tabular ${
                      ders.fark === null ? "text-slate-400" : yukseldi ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {ders.fark === null ? "—" : `${yukseldi ? "+" : "−"}${net(Math.abs(ders.fark))}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="mt-4 space-y-3">
        <KonuKutusu
          baslik="1. Önce bunları çalış"
          aciklama="Bu konuları hem önceki denemelerde hem son denemende yanlış yaptın. Rehberlik görüşmesinde buradan başlayın."
          renk="rose"
          satirlar={hala}
          bosYazi="Tekrarlayan açık konu yok."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <KonuKutusu
            baslik="2. Bu denemede yeni çıkanlar"
            aciklama="Daha önce tam yanlış değildi, bu denemede tamamen yanlış oldu."
            renk="amber"
            satirlar={yeni}
            bosYazi="Bu denemede yeni tam yanlış yok."
          />
          <KonuKutusu
            baslik="3. Düzelenler"
            aciklama="Önceden yanlıştı, son denemende düzeldi. Bu gidişi koru."
            renk="emerald"
            satirlar={duzeldi}
            bosYazi="Henüz düzelen konu yok."
          />
        </div>
      </div>

      <section className="karne-renk mt-4 break-inside-avoid rounded-lg border border-slate-900 bg-slate-50 px-4 py-3">
        <h2 className="text-[14px] font-semibold text-slate-950">Ne yapmalısın?</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-6 text-slate-700">
          {yapilacak.map((madde) => (
            <li key={madde}>{madde}</li>
          ))}
        </ul>
      </section>

      <section className="mt-4 break-inside-avoid">
        <h2 className="text-[14px] font-semibold text-slate-950">Girdiğin denemeler</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Soldan sağa ilk denemeden son denemeye. Tek çizgi netinin iniş çıkışını gösterir.
        </p>
        <NetGelisimCizgisi denemeler={denemeler} />
        <table className="mt-2 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[12px] text-slate-500">
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
