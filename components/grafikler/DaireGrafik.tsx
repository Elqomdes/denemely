"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ARAC_IPUCU_STILI } from "./renkler";

export interface Dilim {
  ad: string;
  deger: number;
  renk: string;
  not?: string;
}

const sayiBicimi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

function payYuzdesi(deger: number, toplam: number): string {
  if (toplam <= 0) return "—";
  return `%${sayiBicimi.format((deger / toplam) * 100)}`;
}

export function DaireGrafik({
  dilimler,
  orta,
  ortaAlt,
  yukseklik = 220,
}: {
  dilimler: Dilim[];
  orta?: string;
  ortaAlt?: string;
  yukseklik?: number;
}) {
  const toplam = dilimler.reduce((toplamDeger, dilim) => toplamDeger + dilim.deger, 0);
  const gorunen = dilimler.filter((dilim) => dilim.deger > 0);

  if (toplam <= 0 || gorunen.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">Grafik için yeterli veri yok.</p>;
  }

  return (
    <div className="px-3 pb-3">
      <div className="relative" style={{ width: "100%", height: yukseklik }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={gorunen}
              dataKey="deger"
              nameKey="ad"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={gorunen.length > 1 ? 2 : 0}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {gorunen.map((dilim) => (
                <Cell key={dilim.ad} fill={dilim.renk} />
              ))}
            </Pie>
            <Tooltip
              isAnimationActive={false}
              formatter={(value, name) => {
                const sayi = typeof value === "number" ? value : Number(value);
                const guvenli = Number.isFinite(sayi) ? sayi : 0;
                return [`${sayiBicimi.format(guvenli)} · ${payYuzdesi(guvenli, toplam)}`, String(name)];
              }}
              contentStyle={ARAC_IPUCU_STILI}
            />
          </PieChart>
        </ResponsiveContainer>
        {orta ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="tabular text-[22px] font-semibold leading-none text-slate-900">{orta}</p>
              {ortaAlt ? <p className="mt-1 text-[11px] text-slate-500">{ortaAlt}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
      <ul className="mt-1 space-y-1.5">
        {dilimler.map((dilim) => (
          <li key={dilim.ad} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: dilim.renk }} />
              <span className="truncate text-slate-700">
                {dilim.ad}
                {dilim.not ? <span className="text-slate-400"> · {dilim.not}</span> : null}
              </span>
            </span>
            <span className="tabular shrink-0 text-slate-600">
              {sayiBicimi.format(dilim.deger)} · {payYuzdesi(dilim.deger, toplam)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
