import { notFound } from "next/navigation";
import { Etiket, Kart } from "@/components/Kutu";
import { OlcutSerit, SayfaUstu } from "@/components/SayfaUstu";
import { SECENEKLER, grupKisaAdi, soruAnalizi } from "@/lib/analiz";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { basariArkaPlani, tamSayi, tarih, yuzde } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { kurum } = await kurumOturumuGerekli();
  const analiz = await soruAnalizi(examId, kurum.id);
  return { title: analiz ? `${analiz.deneme.ad} — Soru Analizi` : "Soru Analizi" };
}

export default async function SoruAnaliziSayfasi({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const { kurum } = await kurumOturumuGerekli();

  const analiz = await soruAnalizi(examId, kurum.id);
  if (!analiz) notFound();

  const { deneme, gruplar, enZorSorular } = analiz;

  const toplamSoru = gruplar.reduce((toplam, grup) => toplam + grup.sorular.length, 0);
  const kitapcikSayisi = new Set(gruplar.map((grup) => grup.kitapcik ?? "-")).size;
  const tumSorular = gruplar.flatMap((grup) => grup.sorular);
  const ortalamaBasari =
    tumSorular.length > 0
      ? tumSorular.reduce((toplam, soru) => toplam + soru.basariYuzde, 0) / tumSorular.length
      : null;
  const bosOrani =
    tumSorular.length > 0
      ? (tumSorular.reduce((toplam, soru) => toplam + soru.bos, 0) /
          tumSorular.reduce((toplam, soru) => toplam + soru.toplam, 0)) *
        100
      : null;

  return (
    <div className="space-y-4">
      <SayfaUstu
        baslik="Soru analizi"
        meta={`${deneme.ad} · ${tarih(deneme.tarih)}`}
        geri={{ yazi: "Deneme detayı", yol: `/panel/denemeler/${deneme.id}` }}
      />

      <OlcutSerit
        ogeler={[
          { etiket: "Soru", deger: tamSayi(toplamSoru) },
          { etiket: "Ort. başarı", deger: yuzde(ortalamaBasari) },
          { etiket: "Boş oranı", deger: yuzde(bosOrani) },
          { etiket: "Kitapçık", deger: tamSayi(kitapcikSayisi) },
        ]}
      />

      <Kart
        baslik="En çok zorlanılan sorular"
        aciklama="Doğru yapma oranı en düşük 15 soru; çeldirici, yanlış yapanların en çok işaretlediği seçenektir."
      >
        <div className="overflow-x-auto">
          <table className="tablo">
            <thead>
              <tr>
                <th>Bölüm</th>
                <th className="sayi">Soru</th>
                <th>Kitapçık</th>
                <th>Doğru cevap</th>
                <th className="sayi">Doğru</th>
                <th className="sayi">Yanlış</th>
                <th className="sayi">Boş</th>
                <th>Çeldirici</th>
                <th className="sayi">Başarı</th>
              </tr>
            </thead>
            <tbody>
              {enZorSorular.map((soru) => (
                <tr key={`${soru.dersGrubu}-${soru.kitapcik ?? "-"}-${soru.soruNo}`}>
                  <td className="text-slate-700">{grupKisaAdi(soru.dersGrubu)}</td>
                  <td className="sayi font-semibold text-slate-900">{soru.soruNo}</td>
                  <td className="text-slate-500">{soru.kitapcik ?? "—"}</td>
                  <td>
                    <span className="rounded-sm border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-800">
                      {soru.dogruCevap}
                    </span>
                  </td>
                  <td className="sayi text-emerald-700">{tamSayi(soru.dogru)}</td>
                  <td className="sayi text-rose-700">{tamSayi(soru.yanlis)}</td>
                  <td className="sayi text-slate-500">{tamSayi(soru.bos)}</td>
                  <td className="tabular text-slate-700">
                    {soru.enCokCeldirici ? (
                      <>
                        <span className="rounded-sm border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-800">
                          {soru.enCokCeldirici.secenek}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          {tamSayi(soru.enCokCeldirici.adet)} öğrenci
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="sayi">
                    <span
                      className={`tabular rounded-sm border px-2 py-0.5 text-[13px] font-semibold ${basariArkaPlani(
                        soru.basariYuzde,
                      )}`}
                    >
                      {yuzde(soru.basariYuzde)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kart>

      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold text-slate-900">Soru soru dağılım</h2>
        <p className="text-sm text-slate-600">
          Kitapçıklarda soru sırası farklı olduğu için her kitapçık ayrı listelenir. Doğru seçenek
          yeşil, yanlış yapanların en çok işaretlediği seçenek kırmızı gösterilir.
        </p>
      </div>

      {gruplar.map((grup) => {
        const enZor = [...grup.sorular].sort((a, b) => a.basariYuzde - b.basariYuzde)[0];
        return (
        <details
          key={`${grup.dersGrubu}-${grup.kitapcik ?? "-"}`}
          className="panel yazdirma-kart"
        >
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-slate-900">
                {grupKisaAdi(grup.dersGrubu)}
              </span>
              {grup.kitapcik ? <Etiket ton="marka">Kitapçık {grup.kitapcik}</Etiket> : null}
              <span className="tabular text-sm text-slate-500">
                {tamSayi(grup.ogrenciSayisi)} öğrenci · {tamSayi(grup.sorular.length)} soru
              </span>
            </span>
            {enZor ? (
              <span className="tabular text-sm text-slate-600">
                En zor soru: <span className="font-semibold">{enZor.soruNo}</span> (
                {yuzde(enZor.basariYuzde)})
              </span>
            ) : null}
          </summary>

          <div className="overflow-x-auto border-t border-cerceve">
            <table className="tablo">
              <thead>
                <tr>
                  <th className="sayi">Soru</th>
                  <th>Doğru</th>
                  {SECENEKLER.map((secenek) => (
                    <th key={secenek} className="sayi">
                      {secenek}
                    </th>
                  ))}
                  <th className="sayi">Boş</th>
                  <th className="sayi">Başarı</th>
                </tr>
              </thead>
              <tbody>
                {grup.sorular.map((soru) => (
                  <tr key={soru.soruNo}>
                    <td className="sayi font-medium text-slate-700">{soru.soruNo}</td>
                    <td className="font-semibold text-emerald-700">{soru.dogruCevap}</td>
                    {SECENEKLER.map((secenek) => {
                      const adet = soru.secenekDagilimi[secenek] ?? 0;
                      const dogruSecenek = secenek === soru.dogruCevap;
                      const enCok = soru.enCokCeldirici?.secenek === secenek && adet > 0;
                      return (
                        <td
                          key={secenek}
                          className={`sayi ${
                            dogruSecenek
                              ? "bg-emerald-50 font-semibold text-emerald-800"
                              : enCok
                                ? "bg-rose-50 font-semibold text-rose-800"
                                : adet === 0
                                  ? "text-slate-300"
                                  : "text-slate-600"
                          }`}
                        >
                          {adet}
                        </td>
                      );
                    })}
                    <td className="sayi text-slate-500">{soru.bos}</td>
                    <td className="sayi">
                      <span
                        className={`tabular rounded-sm border px-2 py-0.5 text-[13px] font-semibold ${basariArkaPlani(
                          soru.basariYuzde,
                        )}`}
                      >
                        {yuzde(soru.basariYuzde)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        );
      })}
    </div>
  );
}
