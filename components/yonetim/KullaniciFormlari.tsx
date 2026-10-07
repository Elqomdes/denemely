"use client";

import { useActionState } from "react";
import { kullaniciOlustur, sifreSifirla, type FormDurumu } from "@/app/yonetim/actions";
import { DurumMesaji, GonderButonu, MetinAlani } from "./Alanlar";

export function KullaniciOlusturFormu({ institutionId }: { institutionId: string }) {
  const [durum, formAction, bekliyor] = useActionState<FormDurumu, FormData>(kullaniciOlustur, {});

  return (
    <form action={formAction} className="space-y-4 p-5">
      <input type="hidden" name="institutionId" value={institutionId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetinAlani ad="adSoyad" etiket="Ad soyad" gerekli yerTutucu="Ayşe Yılmaz" />
        <MetinAlani
          ad="kullaniciAdi"
          etiket="Kullanıcı adı"
          gerekli
          yerTutucu="ankaderslik"
          ipucu="Küçük harf, rakam, nokta ve tire."
        />
        <MetinAlani
          ad="sifre"
          etiket="Şifre"
          tur="password"
          gerekli
          enAzUzunluk={8}
          ipucu="En az 8 karakter. Yetkiliye siz ileteceksiniz."
        />
      </div>

      <DurumMesaji durum={durum} />
      <div className="border-t border-cerceve-soluk pt-4">
        <GonderButonu bekliyor={bekliyor} yazi="Hesabı oluştur" bekleyenYazi="Oluşturuluyor…" />
      </div>
    </form>
  );
}

export function SifreSifirlaFormu({
  userId,
  kullaniciAdi,
}: {
  userId: string;
  kullaniciAdi: string;
}) {
  const [durum, formAction, bekliyor] = useActionState<FormDurumu, FormData>(sifreSifirla, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-52">
          <label htmlFor={`sifre-${userId}`} className="mb-1.5 block text-xs font-medium text-slate-600">
            {kullaniciAdi} için yeni şifre
          </label>
          <input
            id={`sifre-${userId}`}
            name="sifre"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="alan py-1.5 text-sm"
          />
        </div>
        <button type="submit" disabled={bekliyor} className="btn btn-ikincil btn-kucuk">
          {bekliyor ? "Kaydediliyor…" : "Şifreyi güncelle"}
        </button>
      </div>
      <DurumMesaji durum={durum} />
    </form>
  );
}
