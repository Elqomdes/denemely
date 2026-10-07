import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

/* IBM Plex: arayüz ve tablo sayıları. Source Serif yalnızca yazdırma için duruyor. */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--yazi-arayuz",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--yazi-veri",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--yazi-baslik",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Denemely — Deneme Sınavı Analiz Platformu",
    template: "%s | Denemely",
  },
  description:
    "Hedefly Eğitim Teknolojileri ürünü. Kurumların deneme sınavı sonuçlarını yükleyip öğrenci bazlı detaylı analiz yapabildiği platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body
        className={`${plexSans.variable} ${plexMono.variable} ${sourceSerif.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
