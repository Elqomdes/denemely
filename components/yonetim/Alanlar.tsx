import type { FormDurumu } from "@/app/yonetim/actions";

export function MetinAlani({
  ad,
  alanId,
  etiket,
  tur = "text",
  varsayilan,
  gerekli = false,
  ipucu,
  yerTutucu,
  enAzUzunluk,
  enCokUzunluk,
  cokSatir = false,
  satir = 4,
}: {
  ad: string;
  alanId?: string;
  etiket: string;
  tur?: "text" | "password" | "url";
  varsayilan?: string | null;
  gerekli?: boolean;
  ipucu?: string;
  yerTutucu?: string;
  enAzUzunluk?: number;
  enCokUzunluk?: number;
  cokSatir?: boolean;
  satir?: number;
}) {
  const htmlId = alanId ?? ad;
  return (
    <div>
      <label htmlFor={htmlId} className="alan-etiketi">
        {etiket}
        {gerekli ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </label>
      {cokSatir ? (
        <textarea
          id={htmlId}
          name={ad}
          required={gerekli}
          minLength={enAzUzunluk}
          maxLength={enCokUzunluk}
          defaultValue={varsayilan ?? ""}
          placeholder={yerTutucu}
          rows={satir}
          spellCheck={false}
          className="alan min-h-24"
        />
      ) : (
        <input
          id={htmlId}
          name={ad}
          type={tur}
          required={gerekli}
          minLength={enAzUzunluk}
          maxLength={enCokUzunluk}
          defaultValue={varsayilan ?? ""}
          placeholder={yerTutucu}
          autoComplete={tur === "password" ? "new-password" : "off"}
          spellCheck={false}
          className="alan"
        />
      )}
      {ipucu ? <p className="alan-ipucu">{ipucu}</p> : null}
    </div>
  );
}

export function DurumMesaji({ durum }: { durum: FormDurumu }) {
  if (durum.hata) {
    return (
      <p role="alert" className="uyari-serit border-rose-200 bg-rose-50 text-rose-700">
        {durum.hata}
      </p>
    );
  }
  if (durum.basari) {
    return (
      <p className="uyari-serit border-emerald-200 bg-emerald-50 text-emerald-800">
        {durum.basari}
      </p>
    );
  }
  return null;
}

export function GonderButonu({
  bekliyor,
  yazi,
  bekleyenYazi,
}: {
  bekliyor: boolean;
  yazi: string;
  bekleyenYazi: string;
}) {
  return (
    <button type="submit" disabled={bekliyor} className="btn btn-birincil">
      {bekliyor ? bekleyenYazi : yazi}
    </button>
  );
}
