import Link from "next/link";

export function Kart({
  baslik,
  aciklama,
  sagUst,
  children,
  className = "",
}: {
  baslik?: string;
  aciklama?: string;
  sagUst?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel yazdirma-kart ${className}`}>
      {baslik ? (
        <header className="panel-baslik">
          <div>
            <h2 className="bolum-basligi">{baslik}</h2>
            {aciklama ? <p className="mt-0.5 text-[13px] text-slate-500">{aciklama}</p> : null}
          </div>
          {sagUst}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function OzetKarti({
  baslik,
  deger,
  aciklama,
}: {
  baslik: string;
  deger: string;
  aciklama?: string;
  vurgu?: boolean;
}) {
  return (
    <div className="yazdirma-kart rounded-xl border border-cerceve bg-yuzey px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_30px_rgba(15,23,42,0.03)]">
      <p className="text-[12px] font-medium text-slate-500">{baslik}</p>
      <p className="olcut-deger mt-1">{deger}</p>
      {aciklama ? <p className="mt-1 truncate text-xs text-slate-500">{aciklama}</p> : null}
    </div>
  );
}

export function BosDurum({
  baslik,
  aciklama,
  baglantiYazisi,
  baglantiYolu,
}: {
  baslik: string;
  aciklama: string;
  baglantiYazisi?: string;
  baglantiYolu?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-marka-200 bg-gradient-to-br from-white to-marka-50/50 px-6 py-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-marka-100 text-xl font-semibold text-marka-600">
        D
      </div>
      <h3 className="text-[16px] font-semibold text-slate-900">{baslik}</h3>
      <p className="mx-auto mt-1.5 max-w-xl text-[13.5px] text-slate-600">{aciklama}</p>
      {baglantiYazisi && baglantiYolu ? (
        <Link href={baglantiYolu} className="btn btn-birincil mt-4">
          {baglantiYazisi}
        </Link>
      ) : null}
    </div>
  );
}

export function Etiket({
  children,
  ton = "notr",
}: {
  children: React.ReactNode;
  ton?: "notr" | "olumlu" | "uyari" | "olumsuz" | "marka";
}) {
  const siniflar = {
    notr: "border-cerceve-koyu bg-slate-50 text-slate-600",
    olumlu: "border-emerald-200 bg-emerald-50 text-emerald-800",
    uyari: "border-amber-200 bg-amber-50 text-amber-800",
    olumsuz: "border-rose-200 bg-rose-50 text-rose-800",
    marka: "border-marka-200 bg-marka-50 text-marka-700",
  }[ton];

  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${siniflar}`}>
      {children}
    </span>
  );
}
