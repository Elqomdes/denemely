"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PANEL_YOLLARI = ["/panel", "/panel/denemeler", "/panel/ogrenciler"];

/** Ana bolumler acilir acilmaz istenir; sonraki tiklamada sunucu beklenmez. */
export function SayfalariHazirla() {
  const router = useRouter();

  useEffect(() => {
    for (const yol of PANEL_YOLLARI) router.prefetch(yol);
  }, [router]);

  return null;
}
