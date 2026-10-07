export interface Seri {
  anahtar: string;
  ad: string;
  renk: string;
  kesikli?: boolean;
}

export const GRAFIK_RENKLERI = {
  marka: "#4f46e5",
  turkuaz: "#06b6d4",
  turuncu: "#f59e0b",
  mor: "#8b5cf6",
  gri: "#94a3b8",
  yesil: "#10b981",
  kirmizi: "#f43f5e",
};

export const EKSEN_RENGI = "#cbd5e1";
export const IZGARA_RENGI = "#eef2f7";
export const ETIKET_RENGI = "#64748b";

export const ARAC_IPUCU_STILI = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 30px rgba(15,23,42,.12)",
  fontSize: 12.5,
  fontVariantNumeric: "tabular-nums",
} as const;
