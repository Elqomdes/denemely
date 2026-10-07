"use client";

import { useActionState } from "react";
import { denemeOnayla, type OnayDurumu } from "@/app/panel/denemeler/yukle/actions";

export function OnizlemeFormu({
  token,
  varsayilanAd,
  varsayilanTarih,
  ogrenciSayisi,
}: {
  token: string;
  varsayilanAd: string;
  varsayilanTarih: string;
  ogrenciSayisi: number;
}) {
  const [durum, formAction, bekliyor] = useActionState<OnayDurumu, FormData>(denemeOnayla, {});

  return (
    <form action={formAction} className="space-y-4 p-5">
      <input type="hidden" name="token" value={token} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="denemeAdi" className="alan-etiketi">
            Deneme adı
          </label>
          <input
            id="denemeAdi"
            name="denemeAdi"
            type="text"
            required
            maxLength={120}
            defaultValue={varsayilanAd}
            className="alan"
          />
          <p className="alan-ipucu">
            PDF'ten okundu; dilerseniz kurumunuzda kullandığınız adla değiştirin.
          </p>
        </div>

        <div>
          <label htmlFor="tarih" className="alan-etiketi">
            Deneme tarihi
          </label>
          <input
            id="tarih"
            name="tarih"
            type="date"
            required
            defaultValue={varsayilanTarih}
            className="alan"
          />
        </div>
      </div>

      <div className="max-w-xs">
        <label htmlFor="sinavTuru" className="alan-etiketi">
          Sınav türü
        </label>
        <select id="sinavTuru" name="sinavTuru" defaultValue="TYT" className="alan">
          <option value="TYT">TYT</option>
          <option value="AYT">AYT</option>
        </select>
        <p className="alan-ipucu">Öğrenci ve deneme listelerinde bu türe göre ayrı görünür.</p>
      </div>

      {durum.hata ? (
        <p role="alert" className="uyari-serit border-rose-200 bg-rose-50 text-rose-700">
          {durum.hata}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-cerceve-soluk pt-4">
        <button type="submit" disabled={bekliyor} className="btn btn-birincil">
          {bekliyor ? "Kaydediliyor…" : `${ogrenciSayisi} öğrenciyi kaydet`}
        </button>
        <p className="text-xs text-slate-500">
          Aynı ad, tarih ve sınav türünde bir deneme varsa sonuçları güncellenir, kopya oluşmaz.
        </p>
      </div>
    </form>
  );
}
