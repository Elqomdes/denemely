"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { CizgiGrafik as CizgiGrafikTipi } from "./CizgiGrafik";
import type { DaireGrafik as DaireGrafikTipi } from "./DaireGrafik";
import type { SutunGrafik as SutunGrafikTipi } from "./SutunGrafik";

const Cizgi = dynamic(() => import("./CizgiGrafik").then((modul) => modul.CizgiGrafik), {
  ssr: false,
});
const Sutun = dynamic(() => import("./SutunGrafik").then((modul) => modul.SutunGrafik), {
  ssr: false,
});
const Daire = dynamic(() => import("./DaireGrafik").then((modul) => modul.DaireGrafik), {
  ssr: false,
});

export function CizgiGrafik(props: ComponentProps<typeof CizgiGrafikTipi>) {
  return (
    <div style={{ minHeight: props.yukseklik ?? 280 }}>
      <Cizgi {...props} />
    </div>
  );
}

export function SutunGrafik(props: ComponentProps<typeof SutunGrafikTipi>) {
  return (
    <div style={{ minHeight: props.yukseklik ?? 280 }}>
      <Sutun {...props} />
    </div>
  );
}

export function DaireGrafik(props: ComponentProps<typeof DaireGrafikTipi>) {
  return (
    <div style={{ minHeight: props.yukseklik ?? 220 }}>
      <Daire {...props} />
    </div>
  );
}
