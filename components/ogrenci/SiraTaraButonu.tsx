"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { adSirasiTara, type TaramaDurumu } from "@/app/panel/ogrenciler/actions";

export function SiraTaraButonu() {
  const router = useRouter();
  const [durum, formAction, bekliyor] = useActionState<TaramaDurumu, FormData>(adSirasiTara, {});

  useEffect(() => {
    if (durum.basari) router.refresh();
  }, [durum.basari, router]);

  return (
    <form action={formAction} className="space-y-2">
      <button type="submit" disabled={bekliyor} className="btn btn-birincil btn-kucuk">
        {bekliyor ? "İsimler taranıyor…" : "Ad sırasını tara ve birleştir"}
      </button>
      {durum.hata ? (
        <p role="alert" className="uyari-serit border-rose-200 bg-rose-50 text-rose-700">
          {durum.hata}
        </p>
      ) : null}
      {durum.basari ? (
        <div className="uyari-serit border-emerald-200 bg-emerald-50 text-emerald-800">
          <p>{durum.basari}</p>
          {durum.satirlar && durum.satirlar.length > 0 ? (
            <ul className="mt-1 list-inside list-disc">
              {durum.satirlar.map((satir) => (
                <li key={satir}>{satir}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
