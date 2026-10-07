"use client";

import { usePathname } from "next/navigation";
import { HizliLink } from "@/components/HizliLink";
import {
  DenemeIkonu,
  GenelBakisIkonu,
  KurumIkonu,
  OgrenciIkonu,
} from "@/components/Ikonlar";

export interface MenuOgesi {
  baslik: string;
  yol: string;
  onEk?: string;
  ikon?: "genel" | "deneme" | "ogrenci" | "kurum";
}

export function YanMenu({ ogeler }: { ogeler: MenuOgesi[] }) {
  const pathname = usePathname();
  const ikonlar = {
    genel: GenelBakisIkonu,
    deneme: DenemeIkonu,
    ogrenci: OgrenciIkonu,
    kurum: KurumIkonu,
  };

  const aktifMi = (oge: MenuOgesi) =>
    oge.onEk ? pathname === oge.yol || pathname.startsWith(oge.onEk) : pathname === oge.yol;

  return (
    <nav className="yazdirma-gizle border-b border-white/10 md:w-64 md:shrink-0 md:border-b-0">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:overflow-visible md:px-3 md:py-5">
        {ogeler.map((oge) => {
          const aktif = aktifMi(oge);
          const Ikon = oge.ikon ? ikonlar[oge.ikon] : null;
          return (
            <li key={oge.yol} className="shrink-0 md:w-full">
              <HizliLink
                href={oge.yol}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13.5px] ${
                  aktif
                    ? "bg-white/12 font-semibold text-white shadow-sm"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {Ikon ? <Ikon className="h-[18px] w-[18px] shrink-0" /> : null}
                {oge.baslik}
              </HizliLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
