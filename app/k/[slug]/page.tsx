import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GirisFormu } from "@/components/GirisFormu";
import { HedeflyImza, Logo } from "@/components/Marka";
import { ROLLER } from "@/lib/auth/roller";
import { oturumuOku } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kurum = await prisma.institution.findUnique({
    where: { slug },
    select: { ad: true },
  });
  return { title: kurum ? `${kurum.ad} Girişi` : "Kurum Girişi" };
}

export default async function KurumGirisSayfasi({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const kurum = await prisma.institution.findUnique({
    where: { slug },
    select: { ad: true, il: true, ilce: true, logoUrl: true, aktif: true, slug: true },
  });
  if (!kurum) notFound();

  const oturum = await oturumuOku();
  if (oturum) redirect(oturum.rol === ROLLER.SUPERADMIN ? "/yonetim" : "/panel");

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-5 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,.3),transparent_30rem),radial-gradient(circle_at_85%_80%,rgba(6,182,212,.16),transparent_26rem)]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative z-10 w-full max-w-[440px]">
        <Link href="/" className="mb-8 inline-block">
          <Logo boyut="md" ton="acik" />
        </Link>
        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,.32)]">
          <div className="mb-6 border-b border-slate-100 pb-5">
            {kurum.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={kurum.logoUrl} alt="" className="mb-4 h-11 w-auto object-contain" />
            ) : (
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-marka-500 to-cyan-400 text-[17px] font-semibold text-white">
                {kurum.ad.charAt(0)}
              </div>
            )}
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-marka-600">
              Kurum paneli
            </p>
            <h1 className="mt-1.5 text-[23px] font-semibold tracking-[-0.025em] text-slate-950">
              {kurum.ad}
            </h1>
            {kurum.il || kurum.ilce ? (
              <p className="mt-1 text-[13px] text-slate-500">
                {[kurum.il, kurum.ilce].filter(Boolean).join(" / ")}
              </p>
            ) : null}
          </div>
          {kurum.aktif ? (
            <GirisFormu kurumSlug={kurum.slug} />
          ) : (
            <p className="uyari-serit border-amber-200 bg-amber-50 text-amber-900">
              Bu kurumun Denemely erişimi şu anda kapalı. Hedefly ile iletişime geçin.
            </p>
          )}
        </div>
        <HedeflyImza className="mt-6 text-center" ton="acik" />
      </div>
    </main>
  );
}
