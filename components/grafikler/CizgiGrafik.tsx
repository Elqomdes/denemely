"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ARAC_IPUCU_STILI,
  EKSEN_RENGI,
  ETIKET_RENGI,
  IZGARA_RENGI,
  type Seri,
} from "./renkler";

export type { Seri };
export { ARAC_IPUCU_STILI, EKSEN_RENGI, ETIKET_RENGI, GRAFIK_RENKLERI, IZGARA_RENGI } from "./renkler";

const sayiBicimi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

const EKSEN_YAZISI = { fontSize: 11.5, fill: ETIKET_RENGI, fontVariantNumeric: "tabular-nums" };

export function CizgiGrafik({
  veri,
  seriler,
  yukseklik = 280,
}: {
  veri: Array<Record<string, string | number | null>>;
  seriler: Seri[];
  yukseklik?: number;
}) {
  if (veri.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">Grafik için yeterli veri yok.</p>;
  }

  return (
    <div style={{ width: "100%", height: yukseklik }}>
      <ResponsiveContainer>
        <LineChart data={veri} margin={{ top: 8, right: 16, bottom: 4, left: -14 }}>
          <CartesianGrid stroke={IZGARA_RENGI} vertical={false} />
          <XAxis dataKey="etiket" tick={EKSEN_YAZISI} stroke={EKSEN_RENGI} tickMargin={8} />
          <YAxis tick={EKSEN_YAZISI} stroke={EKSEN_RENGI} width={54} />
          <Tooltip
            isAnimationActive={false}
            formatter={(value) => (typeof value === "number" ? sayiBicimi.format(value) : "—")}
            contentStyle={ARAC_IPUCU_STILI}
          />
          <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 10 }} />
          {seriler.map((seri) => (
            <Line
              key={seri.anahtar}
              type="monotone"
              dataKey={seri.anahtar}
              name={seri.ad}
              stroke={seri.renk}
              strokeWidth={2.5}
              strokeDasharray={seri.kesikli ? "4 4" : undefined}
              dot={{ r: 3, strokeWidth: 2, stroke: "#fff", fill: seri.renk }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
