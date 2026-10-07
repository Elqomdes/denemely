import { grupKisaAdi } from "@/lib/analiz";

/**
 * Cevap dizisini soru bazinda gorselleştirir.
 * Ogrenci cevaplarinda buyuk harf dogru, kucuk harf yanlis, bosluk bos anlamina gelir.
 */
export function CevapAnalizi({
  dersGrubu,
  kitapcik,
  cevapAnahtari,
  ogrenciCevaplari,
}: {
  dersGrubu: string;
  kitapcik: string | null;
  cevapAnahtari: string;
  ogrenciCevaplari: string;
}) {
  const sorular = [...cevapAnahtari].map((dogruCevap, index) => {
    const verilen = ogrenciCevaplari[index] ?? " ";
    const durum: "dogru" | "yanlis" | "bos" =
      verilen === " " ? "bos" : verilen === verilen.toUpperCase() ? "dogru" : "yanlis";
    return { no: index + 1, dogruCevap, verilen: verilen.trim().toUpperCase(), durum };
  });

  const dogruSayisi = sorular.filter((soru) => soru.durum === "dogru").length;
  const yanlisSayisi = sorular.filter((soru) => soru.durum === "yanlis").length;
  const bosSayisi = sorular.filter((soru) => soru.durum === "bos").length;

  const stiller = {
    dogru: "border-emerald-300 bg-emerald-50 text-emerald-800",
    yanlis: "border-rose-300 bg-rose-50 text-rose-800",
    bos: "border-cerceve bg-slate-50 text-slate-400",
  };

  return (
    <div className="yazdirma-kart border border-cerceve bg-yuzey">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cerceve-soluk px-4 py-2">
        <h3 className="text-[14px] font-semibold text-slate-900">
          {grupKisaAdi(dersGrubu)}
          {kitapcik ? (
            <span className="ml-2 font-normal text-[12.5px] text-slate-500">
              Kitapçık {kitapcik}
            </span>
          ) : null}
        </h3>
        <p className="veri-yazisi text-[11.5px] text-slate-500">
          <span className="font-medium text-emerald-800">{dogruSayisi} doğru</span>
          <span className="mx-2 text-cerceve-koyu">/</span>
          <span className="font-medium text-rose-800">{yanlisSayisi} yanlış</span>
          <span className="mx-2 text-cerceve-koyu">/</span>
          <span className="font-medium text-slate-500">{bosSayisi} boş</span>
        </p>
      </div>

      <ol className="flex flex-wrap gap-[3px] p-4">
        {sorular.map((soru) => (
          <li
            key={soru.no}
            className={`veri-yazisi w-[34px] border px-1 py-1 text-center ${stiller[soru.durum]}`}
            title={
              soru.durum === "dogru"
                ? `${soru.no}. soru: doğru (${soru.dogruCevap})`
                : soru.durum === "yanlis"
                  ? `${soru.no}. soru: ${soru.verilen} işaretlendi, doğrusu ${soru.dogruCevap}`
                  : `${soru.no}. soru: boş, doğrusu ${soru.dogruCevap}`
            }
          >
            <span className="block text-[9.5px] leading-none text-slate-400">{soru.no}</span>
            <span className="block text-[12.5px] font-medium leading-tight">
              {soru.durum === "bos" ? "–" : soru.verilen}
            </span>
            {soru.durum !== "dogru" ? (
              <span className="block text-[9.5px] leading-none opacity-75">{soru.dogruCevap}</span>
            ) : (
              <span className="block text-[9.5px] leading-none opacity-0">·</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
