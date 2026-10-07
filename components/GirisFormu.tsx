"use client";

import { useActionState } from "react";
import { girisYap, type GirisDurumu } from "@/lib/auth/actions";

export function GirisFormu({ kurumSlug }: { kurumSlug?: string }) {
  const [durum, formAction, bekliyor] = useActionState<GirisDurumu, FormData>(girisYap, {});

  return (
    <form action={formAction} className="space-y-4">
      {kurumSlug ? <input type="hidden" name="kurumSlug" value={kurumSlug} /> : null}

      <div>
        <label htmlFor="kullaniciAdi" className="alan-etiketi">
          Kullanıcı adı
        </label>
        <input
          id="kullaniciAdi"
          name="kullaniciAdi"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="alan"
        />
      </div>

      <div>
        <label htmlFor="sifre" className="alan-etiketi">
          Şifre
        </label>
        <input
          id="sifre"
          name="sifre"
          type="password"
          autoComplete="current-password"
          required
          className="alan"
        />
      </div>

      {durum.hata ? (
        <p role="alert" className="uyari-serit border-rose-200 bg-rose-50 text-rose-700">
          {durum.hata}
        </p>
      ) : null}

      <button type="submit" disabled={bekliyor} className="btn btn-birincil w-full">
        {bekliyor ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>

      <p className="border-t border-cerceve-soluk pt-3 text-xs text-slate-500">
        Hesaplar Hedefly tarafından açılır. Şifrenizi bilmiyorsanız kurum yöneticinize sorun.
      </p>
    </form>
  );
}
