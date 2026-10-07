import Link from "next/link";
import { redirect } from "next/navigation";
import { GirisFormu } from "@/components/GirisFormu";
import { GrafikIkonu, OgrenciIkonu, YukleIkonu } from "@/components/Ikonlar";
import { HedeflyImza, Logo } from "@/components/Marka";
import { ROLLER } from "@/lib/auth/roller";
import { oturumuOku } from "@/lib/auth/session";

export const metadata = { title: "Giriş" };

const HATA_MESAJLARI: Record<string, string> = {
  "kurum-pasif": "Kurum hesabınız şu anda pasif. Hedefly ile iletişime geçin.",
};

export default async function GirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const oturum = await oturumuOku();
  if (oturum) redirect(oturum.rol === ROLLER.SUPERADMIN ? "/yonetim" : "/panel");

  const { hata } = await searchParams;

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(99,102,241,.32),transparent_28rem),radial-gradient(circle_at_90%_80%,rgba(6,182,212,.18),transparent_24rem)]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className="relative z-10"><Logo boyut="md" ton="acik" /></div>
        <div className="relative z-10 my-auto max-w-xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Denemeden içgörüye</p>
          <h1 className="mt-4 text-[46px] font-semibold leading-[1.08] tracking-[-0.045em]">
            Rehberlik ekibinizin yeni çalışma alanı.
          </h1>
          <p className="mt-5 max-w-lg text-[16px] leading-7 text-slate-300">
            Deneme sonuçlarını yükleyin, öğrenci gelişimini izleyin ve görüşmelere hazır analizlerle girin.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { Ikon: YukleIkonu, yazi: "PDF aktarımı" },
              { Ikon: OgrenciIkonu, yazi: "Öğrenci geçmişi" },
              { Ikon: GrafikIkonu, yazi: "Kazanım analizi" },
            ].map(({ Ikon, yazi }) => (
              <div key={yazi} className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <Ikon className="h-5 w-5 text-cyan-300" />
                <p className="mt-3 text-[13px] font-medium text-slate-200">{yazi}</p>
              </div>
            ))}
          </div>
        </div>
        <HedeflyImza className="relative z-10" ton="acik" />
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_100%_0%,rgba(99,102,241,.08),transparent_28rem)] px-5 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Logo boyut="md" />
            <Link href="/" className="text-[13px] font-medium text-slate-500">Ana sayfa</Link>
          </div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-marka-600">Güvenli erişim</p>
          <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-slate-950">Kurum hesabınıza girin</h2>
          <p className="mt-2 text-[14px] text-slate-500">Size tanımlanan kullanıcı adı ve şifreyi kullanın.</p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.08)]">
            {hata && HATA_MESAJLARI[hata] ? (
              <p className="uyari-serit mb-4 border-amber-200 bg-amber-50 text-amber-900">
                {HATA_MESAJLARI[hata]}
              </p>
            ) : null}
            <GirisFormu />
          </div>
          <p className="mt-6 text-center text-[12px] text-slate-400">
            <Link href="/" className="hover:text-marka-600">Denemely ana sayfasına dön</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
