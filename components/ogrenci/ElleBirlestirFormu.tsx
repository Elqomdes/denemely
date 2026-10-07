"use client";

import { useState } from "react";
import { ogrencileriBirlestir } from "@/app/panel/ogrenciler/actions";

interface DigerOgrenci {
  id: string;
  adSoyad: string;
  sinif: string | null;
  denemeSayisi: number;
}

/**
 * Oneri listesinde cikmayan durumlar icin elle birlestirme.
 * Secilen kayit kaldirilir, sonuclari bu ogrenciye tasinir.
 */
export function ElleBirlestirFormu({
  hedefId,
  hedefAd,
  digerleri,
}: {
  hedefId: string;
  hedefAd: string;
  digerleri: DigerOgrenci[];
}) {
  const [secilenId, setSecilenId] = useState("");
  const secilen = digerleri.find((ogrenci) => ogrenci.id === secilenId);

  if (digerleri.length === 0) {
    return (
      <p className="p-5 text-sm text-slate-500">
        Kurumda birleştirilebilecek başka öğrenci kaydı yok.
      </p>
    );
  }

  return (
    <form
      action={ogrencileriBirlestir}
      onSubmit={(event) => {
        if (!secilen) {
          event.preventDefault();
          return;
        }
        const onay =
          `"${secilen.adSoyad}" kaydı kaldırılacak ve ${secilen.denemeSayisi} deneme sonucu ` +
          `"${hedefAd}" kaydına taşınacak. Bu işlem geri alınamaz. Onaylıyor musunuz?`;
        if (!window.confirm(onay)) event.preventDefault();
      }}
      className="space-y-4 p-5"
    >
      <input type="hidden" name="hedefId" value={hedefId} />
      <input type="hidden" name="donus" value={`/panel/ogrenciler/${hedefId}`} />

      <div className="max-w-md">
        <label htmlFor="kaynakId" className="alan-etiketi">
          Bu öğrenciyle birleştirilecek kayıt
        </label>
        <select
          id="kaynakId"
          name="kaynakId"
          required
          value={secilenId}
          onChange={(event) => setSecilenId(event.target.value)}
          className="alan"
        >
          <option value="">Kayıt seçin…</option>
          {digerleri.map((ogrenci) => (
            <option key={ogrenci.id} value={ogrenci.id}>
              {ogrenci.adSoyad}
              {ogrenci.sinif ? ` — ${ogrenci.sinif}` : ""} ({ogrenci.denemeSayisi} deneme)
            </option>
          ))}
        </select>
        <p className="alan-ipucu">
          Seçilen kayıt kaldırılır, deneme sonuçları bu öğrencinin altında toplanır.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-slate-700">
          Korunacak ad
        </legend>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="korunacakAd"
              value="hedef"
              defaultChecked
              className="h-4 w-4 border-cerceve text-marka-700"
            />
            {hedefAd}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="korunacakAd"
              value="kaynak"
              className="h-4 w-4 border-cerceve text-marka-700"
            />
            {secilen ? secilen.adSoyad : "Seçilen kaydın adı"}
          </label>
        </div>
      </fieldset>

      <div className="border-t border-cerceve-soluk pt-4">
        <button type="submit" disabled={!secilen} className="btn btn-birincil">
          Kayıtları birleştir
        </button>
      </div>
    </form>
  );
}
