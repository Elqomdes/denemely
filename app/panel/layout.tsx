import Link from "next/link";
import { CikisIkonu } from "@/components/Ikonlar";
import { Logo } from "@/components/Marka";
import { SayfalariHazirla } from "@/components/SayfalariHazirla";
import { YanMenu } from "@/components/YanMenu";
import { cikisYap } from "@/lib/auth/actions";
import { kurumOturumuGerekli } from "@/lib/auth/guards";

const MENU = [
  { baslik: "Genel bakış", yol: "/panel", ikon: "genel" as const },
  {
    baslik: "Denemeler",
    yol: "/panel/denemeler",
    onEk: "/panel/denemeler",
    ikon: "deneme" as const,
  },
  {
    baslik: "Öğrenciler",
    yol: "/panel/ogrenciler",
    onEk: "/panel/ogrenciler",
    ikon: "ogrenci" as const,
  },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { oturum, kurum } = await kurumOturumuGerekli();

  return (
    <div className="min-h-screen bg-zemin md:flex">
      <SayfalariHazirla />
      <aside className="yazdirma-gizle bg-slate-950 text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/panel">
            <Logo boyut="md" ton="acik" />
          </Link>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
            TYT
          </span>
        </div>
        <div className="px-5 pb-1 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Kurum paneli
          </p>
        </div>
        <YanMenu ogeler={MENU} />
        <div className="mt-auto hidden border-t border-white/10 p-4 md:block">
          <p className="truncate text-[13px] font-medium text-white">{oturum.adSoyad}</p>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">{kurum.ad}</p>
          <form action={cikisYap} className="mt-3">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-slate-400 hover:bg-white/[0.06] hover:text-white"
            >
              <CikisIkonu className="h-4 w-4" />
              Oturumu kapat
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="yazdirma-gizle sticky top-0 z-10 flex h-16 items-center justify-between border-b border-cerceve bg-white/85 px-4 backdrop-blur-xl md:px-8">
          <div>
            <p className="truncate text-[13.5px] font-semibold text-slate-800">{kurum.ad}</p>
            <p className="hidden text-[11.5px] text-slate-500 sm:block">
              Deneme ve öğrenci performans merkezi
            </p>
          </div>
          <form action={cikisYap} className="md:hidden">
            <button type="submit" className="btn btn-ikincil btn-kucuk">
              Çıkış
            </button>
          </form>
        </header>
        <main className="mx-auto min-w-0 max-w-[1500px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
