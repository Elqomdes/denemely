import { Logo } from "@/components/Marka";
import {
  GRUP_SIRASI,
  grupKisaAdi,
  kazanimGelisimDurumu,
  type EslesenKazanim,
} from "@/lib/analiz";
import { dersSiraNo } from "@/lib/ders/kanonik";
import { kisaTarih, net, puan, tamSayi, tarih } from "@/lib/format";

const DURUM_YAZISI = {
  hala: "Hâlâ yanlış",
  duzeldi: "Düzeldi",
  yeni: "Son denemede yanlış",
  olculmedi: "Son denemede yok",
} as const;

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
  const karsilastirma = kazanimlar
    .map((kazanim) => ({ kazanim, durum: kazanimGelisimDurumu(kazanim) }))
    .filter(
      (satir): satir is { kazanim: EslesenKazanim; durum: keyof typeof DURUM_YAZISI } =>
        Boolean(satir.durum),
    )
    .sort((a, b) => {
      const sira = { hala: 0, yeni: 1, duzeldi: 2, olculmedi: 3 };
      return (
        sira[a.durum] - sira[b.durum] ||
        dersSiraNo(a.kazanim.dersAdi) - dersSiraNo(b.kazanim.dersAdi) ||
        a.kazanim.kazanim.localeCompare(b.kazanim.kazanim, "tr")
      );
    });

  const hala = karsilastirma.filter((satir) => satir.durum === "hala");
  const duzeldi = karsilastirma.filter((satir) => satir.durum === "duzeldi");
  const yeni = karsilastirma.filter((satir) => satir.durum === "yeni");
  const sonOrtFark = sonDeneme.toplamNet - ortalamaNet;

  const dersSatirlari = dersToplamlari.map((ders) => {
    const son = sonDersler.find((aday) => aday.dersAdi === ders.dersAdi);
    return { ...ders, son };
  });

  return (
    <article className="ekran-disi text-slate-800">
      <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
        <div>
          <Logo boyut="sm" />
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            TYT rehberlik karnesi
          </p>
        </div>
        <div className="text-right text-[12px] text-slate-600">
          <p className="font-semibold text-slate-900">{kurumAd}</p>
          <p>{tarih(new Date())}</p>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[13px]">
        <p>
          <span className="text-slate-500">Öğrenci</span>
          <span className="ml-2 font-semibold text-slate-950">{ogrenci.adSoyad}</span>
        </p>
        <p>
          <span className="text-slate-500">Sınıf</span>
          <span className="ml-2 font-medium text-slate-900">{ogrenci.sinif || "—"}</span>
        </p>
        <p>
          <span className="text-slate-500">Numara</span>
          <span className="ml-2 font-medium text-slate-900">
            {ogrenci.ogrenciNo && ogrenci.ogrenciNo !== "0" ? ogrenci.ogrenciNo : "—"}
          </span>
        </p>
        <p>
          <span className="text-slate-500">Deneme</span>
          <span className="ml-2 font-medium text-slate-900">{tamSayi(denemeler.length)}</span>
        </p>
      </section>

      <p className="mt-4 text-[13px] leading-6 text-slate-700">
        {ogrenci.adSoyad} {tamSayi(denemeler.length)} TYT denemesine girdi. Son deneme{" "}
        <span className="font-medium">{sonDeneme.ad}</span> ({kisaTarih(sonDeneme.tarih)}) neti{" "}
        {net(sonDeneme.toplamNet)}, tüm denemelerin ortalaması {net(ortalamaNet)}.
        {sonOrtFark >= 0
          ? ` Son net ortalamanın ${net(sonOrtFark)} üzerinde.`
          : ` Son net ortalamanın ${net(Math.abs(sonOrtFark))} altında.`}{" "}
        {tamSayi(hala.length)} kazanım hem önceki denemelerde hem son denemede yanlış.
        {duzeldi.length > 0
          ? ` ${tamSayi(duzeldi.length)} kazanımda düzelme var.`
          : ""}
        {yeni.length > 0
          ? ` Son denemede ${tamSayi(yeni.length)} kazanım ilk kez tam yanlış.`
          : ""}
      </p>

      <dl className="mt-4 grid grid-cols-3 border border-slate-300 text-center">
        <div className="border-r border-slate-300 px-3 py-2">
          <dt className="text-[11px] text-slate-500">Hâlâ yanlış</dt>
          <dd className="mt-0.5 text-[20px] font-semibold text-rose-800">{tamSayi(hala.length)}</dd>
        </div>
        <div className="border-r border-slate-300 px-3 py-2">
          <dt className="text-[11px] text-slate-500">Düzelen</dt>
          <dd className="mt-0.5 text-[20px] font-semibold text-emerald-800">{tamSayi(duzeldi.length)}</dd>
        </div>
        <div className="px-3 py-2">
          <dt className="text-[11px] text-slate-500">Son denemede yeni</dt>
          <dd className="mt-0.5 text-[20px] font-semibold text-slate-900">{tamSayi(yeni.length)}</dd>
        </div>
      </dl>

      <section className="mt-5">
        <h2 className="text-[13px] font-semibold text-slate-950">Deneme özeti</h2>
        <table className="mt-1 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-1.5">Deneme</th>
              <th className="py-1.5">Tarih</th>
              {GRUP_SIRASI.map((grup) => (
                <th key={grup} className="py-1.5 text-right">
                  {grupKisaAdi(grup)}
                </th>
              ))}
              <th className="py-1.5 text-right">Net</th>
              <th className="py-1.5 text-right">Puan</th>
            </tr>
          </thead>
          <tbody>
            {[...denemeler].reverse().map((deneme) => (
              <tr key={deneme.id} className="border-b border-slate-200">
                <td className="py-1.5 font-medium text-slate-900">{deneme.ad}</td>
                <td className="py-1.5 text-slate-600">{kisaTarih(deneme.tarih)}</td>
                {GRUP_SIRASI.map((grup) => (
                  <td key={grup} className="py-1.5 text-right text-slate-600">
                    {net(deneme.grupNetleri?.[grup] ?? null)}
                  </td>
                ))}
                <td className="py-1.5 text-right font-semibold">{net(deneme.toplamNet)}</td>
                <td className="py-1.5 text-right text-slate-600">{puan(deneme.puan)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-5">
        <h2 className="text-[13px] font-semibold text-slate-950">Ders netleri</h2>
        <p className="text-[11.5px] text-slate-500">Son deneme, tüm denemelerin ortalamasıyla yan yana.</p>
        <table className="mt-1 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-1.5">Ders</th>
              <th className="py-1.5 text-right">Ort. net</th>
              <th className="py-1.5 text-right">Son net</th>
              <th className="py-1.5 text-right">Son D / Y / B</th>
            </tr>
          </thead>
          <tbody>
            {dersSatirlari.map((ders) => (
              <tr key={ders.dersAdi} className="border-b border-slate-200">
                <td className="py-1.5 font-medium text-slate-900">
                  {ders.dersAdi}
                  <span className="ml-1.5 font-normal text-slate-400">{grupKisaAdi(ders.dersGrubu)}</span>
                </td>
                <td className="py-1.5 text-right">{net(ders.net)}</td>
                <td className="py-1.5 text-right font-semibold">{ders.son ? net(ders.son.net) : "—"}</td>
                <td className="py-1.5 text-right text-slate-600">
                  {ders.son
                    ? `${tamSayi(ders.son.dogru)} / ${tamSayi(ders.son.yanlis)} / ${tamSayi(ders.son.bos)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-5">
        <h2 className="text-[13px] font-semibold text-slate-950">Kazanım karşılaştırması</h2>
        <p className="text-[11.5px] text-slate-500">
          Geçmiş yanlışlar ile son denemedeki yanlışlar. Hâlâ yanlış olanlar görüşmenin önceliğidir.
        </p>
        {karsilastirma.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-slate-600">Karşılaştırılacak yanlış kazanım yok.</p>
        ) : (
          <table className="mt-1 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-300 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-1.5">Ders</th>
                <th className="py-1.5">Kazanım</th>
                <th className="py-1.5 text-right">Geçmiş</th>
                <th className="py-1.5">Son deneme</th>
                <th className="py-1.5">Durum</th>
              </tr>
            </thead>
            <tbody>
              {karsilastirma.map(({ kazanim, durum }) => (
                <tr
                  key={`${kazanim.dersGrubu}-${kazanim.dersAdi}-${kazanim.kazanim}`}
                  className="border-b border-slate-200"
                >
                  <td className="py-1.5 align-top font-medium text-slate-900">{kazanim.dersAdi}</td>
                  <td className="py-1.5 align-top text-slate-800">{kazanim.kazanim}</td>
                  <td className="py-1.5 align-top text-right text-slate-600">
                    {tamSayi(kazanim.yanlisDeneme)}/{tamSayi(kazanim.denemeSayisi)}
                  </td>
                  <td className="py-1.5 align-top text-slate-700">
                    {kazanim.sonDenemedeVar
                      ? kazanim.sonDenemedeYanlis
                        ? "Yanlış"
                        : "Doğru / kısmen"
                      : "Yok"}
                  </td>
                  <td className="py-1.5 align-top font-medium text-slate-900">{DURUM_YAZISI[durum]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-6 border-t border-slate-300 pt-3">
        <h2 className="text-[13px] font-semibold text-slate-950">Rehber öğretmen notu</h2>
        <p className="mt-3 border-b border-slate-300 leading-[2.2]">&nbsp;</p>
        <p className="border-b border-slate-300 leading-[2.2]">&nbsp;</p>
        <p className="border-b border-slate-300 leading-[2.2]">&nbsp;</p>
      </section>
    </article>
  );
}
