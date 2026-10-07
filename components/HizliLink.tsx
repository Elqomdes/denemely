"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type LinkOzellikleri = ComponentProps<typeof Link>;

/** Gelistirme sunucusunda Next baglanti onyuklemeyi kapatiyor. Imlec gelince sayfa istenir. */
export function HizliLink({ href, prefetch = true, onMouseEnter, onFocus, ...props }: LinkOzellikleri) {
  const router = useRouter();

  const hazirla = () => {
    const yol =
      typeof href === "string" ? href : `${href.pathname ?? ""}${href.search ?? ""}${href.hash ?? ""}`;
    if (yol) router.prefetch(yol);
  };

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={(event) => {
        hazirla();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        hazirla();
        onFocus?.(event);
      }}
      {...props}
    />
  );
}
