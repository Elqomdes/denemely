import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DenemeIkonu,
  GrafikIkonu,
  OgrenciIkonu,
  YukleIkonu,
} from "@/components/Ikonlar";
import { Logo } from "@/components/Marka";
import { ROLLER } from "@/lib/auth/roller";
import { oturumuOku } from "@/lib/auth/session";

const OZELLIKLER = [
  {
    Ikon: YukleIkonu,
    baslik: "Denemeler",
    metin: "Sonuç belgesini PDF olarak yükleyin. Her belge ayrı bir deneme olarak kaydolur.",
  },
  {
    Ikon: OgrenciIkonu,
    baslik: "Öğrenciler",
    metin: "Öğrencinin girdiği denemeler bir aradadır. Net ve puan gelişimi aynı sayfada durur.",
  },
  {
    Ikon: GrafikIkonu,
    baslik: "Analizler",
    metin: "Ders başarıları, kazanımlar ve denemeler arası yanlışlar rehberlik için hazırlanır.",
  },
  {
    Ikon: DenemeIkonu,
    baslik: "Veli karnesi",
    metin: "Seçtiğiniz denemenin karnesini bağlantı ile gönderin. Veli yalnızca o kaydı görür.",
  },
];

const ADIMLAR = [
  { no: "1", baslik: "Kurum hesabı", metin: "Hesabı Hedefly açar. Size iletilen kullanıcı adı ve şifre ile girilir." },
  { no: "2", baslik: "Belge yükleme", metin: "TYT sonuç belgesini panele yükleyin. Öğrenci kayıtları belgeden oluşur." },
  { no: "3", baslik: "Rehberlik", metin: "Net, ders ve kazanıma bakın. Gerekirse veliye karne bağlantısı gönderin." },
];

const NETLER = [
  { ders: "Türkçe", net: "28,75", genislik: "72%" },
  { ders: "Sosyal", net: "12,50", genislik: "62%" },
  { ders: "Matematik", net: "22,00", genislik: "55%" },
  { ders: "Fen", net: "16,25", genislik: "68%" },
];

export default async function AnaSayfa() {
  const oturum = await oturumuOku();
  if (oturum) redirect(oturum.rol === ROLLER.SUPERADMIN ? "/yonetim" : "/panel");

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800">
      <header className="sticky top-0 z-20 border-b border-cerceve bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" className="shrink-0">
            <Logo boyut="md" />
          </Link>
          <nav className="hidden items-center gap-7 text-[14.5px] font-medium text-slate-600 md:flex">
            <a href="#ozellikler" className="hover:text-slate-950">
              Özellikler
            </a>
            <a href="#nasil" className="hover:text-slate-950">
              Nasıl çalışır
            </a>
          </nav>
          <Link
            href="/giris"
            className="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-[14px] font-semibold text-white hover:bg-slate-800"
          >
            Giriş yap
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,.95fr)] lg:py-20">
          <div>
            <p className="text-[14px] font-medium text-marka-700">Dershane ve kurs kurumları</p>
            <h1 className="mt-3 text-[36px] font-semibold leading-[1.15] tracking-[-0.03em] text-slate-950 sm:text-[44px]">
              Deneme sonuçlarını yükleyin, öğrencinin netini ve eksiğini görün.
            </h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-7 text-slate-600">
              Denemely, TYT sonuç belgelerini kurum kaydına çevirir. Net, ders ve kazanımlar
              rehberlik görüşmesi için panelde durur. Öğrenci ve veli sisteme girmez.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/giris" className="btn btn-birincil min-h-11 px-6 text-[15px]">
                Kurum girişi
              </Link>
              <a href="#nasil" className="btn btn-ikincil min-h-11 px-6 text-[15px]">
                Nasıl çalışır
              </a>
            </div>
            <p className="mt-5 text-[13px] text-slate-500">Hedefly Eğitim Teknolojileri ürünüdür.</p>
          </div>

          <aside className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-slate-900">TYT net özeti</p>
              <span className="rounded-full bg-marka-50 px-2.5 py-0.5 text-[11px] font-semibold text-marka-700">
                Örnek
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-slate-500">Türkçe · Sosyal · Matematik · Fen</p>
            <ul className="mt-5 space-y-4">
              {NETLER.map((satir) => (
                <li key={satir.ders}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="font-medium text-slate-700">{satir.ders}</span>
                    <span className="veri-yazisi text-slate-950">{satir.net}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-marka-600" style={{ width: satir.genislik }} />
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section id="ozellikler" className="border-y border-cerceve bg-zemin">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-950">Panelde neler var</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-600">
              Kurum yetkilisi belgeyi yükler. Rehberlik, öğrencinin tüm denemelerine tek yerden bakar.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {OZELLIKLER.map((oge) => (
                <article key={oge.baslik} className="rounded-xl border border-cerceve bg-white p-5">
                  <oge.Ikon className="h-5 w-5 text-marka-600" />
                  <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{oge.baslik}</h3>
                  <p className="mt-2 text-[13.5px] leading-6 text-slate-600">{oge.metin}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="nasil" className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-950">Nasıl çalışır</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {ADIMLAR.map((adim) => (
                <li key={adim.no} className="rounded-xl border border-cerceve bg-white p-5">
                  <span className="veri-yazisi text-[18px] font-medium text-marka-600">{adim.no}</span>
                  <h3 className="mt-3 text-[15px] font-semibold text-slate-900">{adim.baslik}</h3>
                  <p className="mt-2 text-[13.5px] leading-6 text-slate-600">{adim.metin}</p>
                </li>
              ))}
            </ol>
            <Link href="/giris" className="btn btn-birincil mt-8 min-h-11 px-6 text-[15px]">
              Panele gir
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-cerceve bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
          <div>
            <Logo boyut="sm" />
            <p className="mt-3 max-w-xs text-[13px] leading-6 text-slate-500">
              TYT deneme sınavı kayıt ve analiz paneli. Hedefly Eğitim Teknolojileri ürünüdür.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900">Panel</p>
            <ul className="mt-3 space-y-2 text-[13.5px] text-slate-600">
              <li>
                <a href="#ozellikler" className="hover:text-slate-950">
                  Özellikler
                </a>
              </li>
              <li>
                <a href="#nasil" className="hover:text-slate-950">
                  Nasıl çalışır
                </a>
              </li>
              <li>
                <Link href="/giris" className="hover:text-slate-950">
                  Kurum girişi
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900">Kurum</p>
            <p className="mt-3 text-[13.5px] leading-6 text-slate-600">
              Hesaplar Hedefly tarafından açılır. Öğrenci kaydı belgeden gelir; öğrenci girişi yoktur.
            </p>
          </div>
        </div>
        <div className="border-t border-cerceve">
          <p className="mx-auto max-w-6xl px-5 py-4 text-[12.5px] text-slate-500">
            © {new Date().getFullYear()} Denemely · Hedefly Eğitim Teknolojileri
          </p>
        </div>
      </footer>
    </div>
  );
}
