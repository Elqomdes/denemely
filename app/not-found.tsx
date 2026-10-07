import Link from "next/link";
import { HalkaSerit } from "@/components/HalkaSerit";
import { HedeflyImza } from "@/components/Marka";

export const metadata = { title: "Sayfa bulunamadı" };

export default function BulunamadiSayfasi() {
  return (
    <div className="min-h-screen bg-zemin">
      <HalkaSerit />
      <main className="mx-auto max-w-md px-4 py-16">
        <p className="text-[13px] text-slate-500">404</p>
        <h1 className="mt-1 text-[20px] font-semibold text-slate-900">Sayfa bulunamadı</h1>
        <p className="mt-2 text-[14px] text-slate-600">
          Adres yanlış yazılmış olabilir. Kurum giriş adresinizi bilmiyorsanız Hedefly ile
          konuşun.
        </p>
        <Link href="/giris" className="btn btn-birincil mt-5">
          Giriş sayfası
        </Link>
        <HedeflyImza className="mt-8" />
      </main>
    </div>
  );
}
