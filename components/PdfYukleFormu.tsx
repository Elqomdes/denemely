"use client";

import { useActionState } from "react";
import { pdfYukle, type YuklemeDurumu } from "@/app/panel/denemeler/yukle/actions";

export function PdfYukleFormu() {
  const [durum, formAction, bekliyor] = useActionState<YuklemeDurumu, FormData>(pdfYukle, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="dosya" className="alan-etiketi">
          Sonuç belgesi
        </label>
        <input
          id="dosya"
          name="dosya"
          type="file"
          accept="application/pdf,.pdf"
          required
          className="alan"
        />
        <p className="alan-ipucu">Her sayfası bir öğrenci karnesi olan PDF, en fazla 25 MB.</p>
      </div>

      {durum.hata ? (
        <p role="alert" className="uyari-serit border-rose-200 bg-rose-50 text-rose-700">
          {durum.hata}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={bekliyor} className="btn btn-birincil">
          {bekliyor ? "PDF okunuyor…" : "Oku ve önizle"}
        </button>
        {bekliyor ? (
          <p className="text-sm text-slate-500">
            Tanınmayan şablonda öğrenme bir dakika sürebilir.
          </p>
        ) : null}
      </div>
    </form>
  );
}
