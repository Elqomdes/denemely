import Link from "next/link";
import { SINAV_TURLERI, type SinavTuru, sinavQuery } from "@/lib/sinav";

export function SinavTuruSecici({
  deger,
  yol,
  params,
}: {
  deger: SinavTuru;
  yol: string;
  params?: Record<string, string | undefined>;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-cerceve bg-white p-0.5"
      role="group"
      aria-label="Sınav türü"
    >
      {SINAV_TURLERI.map((tur) => {
        const secili = deger === tur;
        return (
          <Link
            key={tur}
            href={`${yol}?${sinavQuery(tur, params)}`}
            className={
              secili
                ? "rounded-md bg-slate-900 px-3.5 py-1.5 text-[13px] font-semibold text-white"
                : "rounded-md px-3.5 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }
            aria-current={secili ? "page" : undefined}
          >
            {tur}
          </Link>
        );
      })}
    </div>
  );
}
