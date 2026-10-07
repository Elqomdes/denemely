/** Hesap rolleri. Veritabaninda String olarak tutulur. */
export const ROLLER = {
  SUPERADMIN: "SUPERADMIN",
  KURUM_YETKILISI: "KURUM_YETKILISI",
} as const;

export type Rol = (typeof ROLLER)[keyof typeof ROLLER];

export const ROL_ADLARI: Record<Rol, string> = {
  SUPERADMIN: "Hedefly Yöneticisi",
  KURUM_YETKILISI: "Kurum Yetkilisi",
};

export function gecerliRolMu(deger: string): deger is Rol {
  return deger === ROLLER.SUPERADMIN || deger === ROLLER.KURUM_YETKILISI;
}
