import Link from "next/link";
import { OkIkonu } from "@/components/Ikonlar";

export function SayfaUstu({
  baslik,
  meta,
  geri,
  children,
}: {
  baslik: React.ReactNode;
  meta?: React.ReactNode;
  geri?: { yazi: string; yol: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {geri ? (
          <Link
            href={geri.yol}
            className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-marka-600"
          >
            <OkIkonu className="h-3.5 w-3.5 rotate-180" />
            {geri.yazi}
          </Link>
        ) : null}
        <h1 className="sayfa-basligi">{baslik}</h1>
        {meta ? <p className="mt-1.5 text-[13.5px] text-slate-500">{meta}</p> : null}
      </div>
      {children ? <div className="yazdirma-gizle flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function OlcutSerit({
  ogeler,
}: {
  ogeler: { etiket: string; deger: string; not?: string }[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ogeler.map((oge, index) => (
        <div
          key={oge.etiket}
          className="relative overflow-hidden rounded-xl border border-cerceve bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_30px_rgba(15,23,42,0.03)]"
        >
          <span
            className={`absolute inset-y-0 left-0 w-1 ${
              index % 4 === 0
                ? "bg-marka-500"
                : index % 4 === 1
                  ? "bg-cyan-500"
                  : index % 4 === 2
                    ? "bg-violet-500"
                    : "bg-emerald-500"
            }`}
          />
          <dt className="text-[12px] font-medium text-slate-500">{oge.etiket}</dt>
          <dd className="mt-1 text-[25px] font-semibold tracking-[-0.035em] text-slate-950">
            {oge.deger}
          </dd>
          {oge.not ? <span className="mt-1 block truncate text-[11.5px] text-slate-500">{oge.not}</span> : null}
        </div>
      ))}
    </dl>
  );
}
