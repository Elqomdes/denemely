"use client";

import { ogrencileriBirlestir } from "@/app/panel/ogrenciler/actions";

/**
 * Iki kaydi birlestirir. Hangi adin korunacagi kullaniciya birakilir; islem
 * geri alinamadigi icin onay isteniyor.
 */
export function BirlestirButonu({
  hedefId,
  kaynakId,
  hedefAd,
  kaynakAd,
  kaynakDenemeSayisi,
  donus,
  yazi = "Kayıtları birleştir",
}: {
  hedefId: string;
  kaynakId: string;
  hedefAd: string;
  kaynakAd: string;
  kaynakDenemeSayisi: number;
  donus: string;
  yazi?: string;
}) {
  const onayMesaji =
    `"${kaynakAd}" kaydı kaldırılacak ve ${kaynakDenemeSayisi} deneme sonucu ` +
    `"${hedefAd}" kaydına taşınacak. Bu işlem geri alınamaz. Onaylıyor musunuz?`;

  return (
    <form
      action={ogrencileriBirlestir}
      onSubmit={(event) => {
        if (!window.confirm(onayMesaji)) event.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="hedefId" value={hedefId} />
      <input type="hidden" name="kaynakId" value={kaynakId} />
      <input type="hidden" name="donus" value={donus} />

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
            {kaynakAd}
          </label>
        </div>
      </fieldset>

      <button type="submit" className="btn btn-birincil btn-kucuk">
        {yazi}
      </button>
    </form>
  );
}
