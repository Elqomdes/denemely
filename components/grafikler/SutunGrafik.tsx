"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

const sayiBicimi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

const EKSEN_YAZISI = { fontSize: 11.5, fill: ETIKET_RENGI, fontVariantNumeric: "tabular-nums" };

export function SutunGrafik({
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
        <BarChart data={veri} margin={{ top: 8, right: 16, bottom: 4, left: -14 }}>
          <CartesianGrid stroke={IZGARA_RENGI} vertical={false} />
          <XAxis dataKey="etiket" tick={EKSEN_YAZISI} stroke={EKSEN_RENGI} tickMargin={8} />
          <YAxis tick={EKSEN_YAZISI} stroke={EKSEN_RENGI} width={54} />
          <Tooltip
            isAnimationActive={false}
            cursor={{ fill: "#f1f5f9", radius: 8 }}
            formatter={(value) => (typeof value === "number" ? sayiBicimi.format(value) : "—")}
            contentStyle={ARAC_IPUCU_STILI}
          />
          <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 10 }} />
          {seriler.map((seri) => (
            <Bar
              key={seri.anahtar}
              dataKey={seri.anahtar}
              name={seri.ad}
              fill={seri.renk}
              radius={[6, 6, 0, 0]}
              maxBarSize={38}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
