"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PANEL_YOLLARI = [
  "/panel",
  "/panel?sinav=TYT",
  "/panel?sinav=AYT",
  "/panel/denemeler",
  "/panel/denemeler?sinav=TYT",
  "/panel/denemeler?sinav=AYT",
  "/panel/ogrenciler",
  "/panel/ogrenciler?sinav=TYT",
  "/panel/ogrenciler?sinav=AYT",
];

/** Ana bolumler acilir acilmaz istenir; sonraki tiklamada sunucu beklenmez. */
export function SayfalariHazirla() {
  const router = useRouter();

  useEffect(() => {
    for (const yol of PANEL_YOLLARI) router.prefetch(yol);
  }, [router]);

  return null;
}
