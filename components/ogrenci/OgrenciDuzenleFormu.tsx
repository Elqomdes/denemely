"use client";

import { useActionState } from "react";
import { ogrenciGuncelle, type OgrenciFormDurumu } from "@/app/panel/ogrenciler/actions";

export function OgrenciDuzenleFormu({
  ogrenci,
  siniflar,
}: {
  ogrenci: { id: string; adSoyad: string; sinif: string | null; ogrenciNo: string | null };
  siniflar: string[];
}) {
  const [durum, formAction, bekliyor] = useActionState<OgrenciFormDurumu, FormData>(
    ogrenciGuncelle,
    {},
  );

  return (
    <form action={formAction} className="space-y-4 p-5">
      <input type="hidden" name="id" value={ogrenci.id} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="adSoyad" className="alan-etiketi">
            Ad soyad
          </label>
          <input
            id="adSoyad"
            name="adSoyad"
            type="text"
            required
            minLength={3}
            maxLength={120}
            defaultValue={ogrenci.adSoyad}
            className="alan"
          />
          <p className="alan-ipucu">
            Optik formda eksik kodlanan ikinci adı buradan tamamlayabilirsiniz.
          </p>
        </div>

        <div>
          <label htmlFor="ogrenciNo" className="alan-etiketi">
            Öğrenci numarası
          </label>
          <input
            id="ogrenciNo"
            name="ogrenciNo"
            type="text"
            maxLength={30}
            defaultValue={ogrenci.ogrenciNo ?? ""}
            className="alan"
          />
        </div>
      </div>

      <div className="max-w-xs">
        <label htmlFor="sinif" className="alan-etiketi">
          Sınıf
        </label>
        <input
          id="sinif"
          name="sinif"
          type="text"
          list="sinif-listesi"
          maxLength={30}
          defaultValue={ogrenci.sinif ?? ""}
          className="alan"
        />
        <datalist id="sinif-listesi">
          {siniflar.map((sinif) => (
            <option key={sinif} value={sinif} />
          ))}
        </datalist>
      </div>

      {durum.hata ? (
        <p role="alert" className="uyari-serit border-rose-200 bg-rose-50 text-rose-700">
          {durum.hata}
        </p>
      ) : null}
      {durum.basari ? (
        <p className="uyari-serit border-emerald-200 bg-emerald-50 text-emerald-800">
          {durum.basari}
        </p>
      ) : null}

      <div className="border-t border-cerceve-soluk pt-4">
        <button type="submit" disabled={bekliyor} className="btn btn-birincil">
          {bekliyor ? "Kaydediliyor…" : "Bilgileri kaydet"}
        </button>
      </div>
    </form>
  );
}
