"use client";

import { useState } from "react";
import { veliKarnesiHazirla } from "@/app/panel/ogrenciler/actions";

export function VeliKarneButonu({
  studentId,
  examId,
  kisa = false,
}: {
  studentId: string;
  examId: string;
  kisa?: boolean;
}) {
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  async function gonder() {
    setBekliyor(true);
    setMesaj(null);
    const pencere = window.open("about:blank", "_blank");
    const sonuc = await veliKarnesiHazirla(studentId, examId);
    if ("hata" in sonuc) {
      pencere?.close();
      setMesaj(sonuc.hata);
      setBekliyor(false);
      return;
    }

    const adres = new URL(sonuc.yol, window.location.origin).href;
    if (pencere) pencere.location.href = adres;
    try {
      await navigator.clipboard.writeText(adres);
      setMesaj("Veli sayfası açıldı. Bağlantı kopyalandı; WhatsApp veya mesajla iletebilirsiniz.");
    } catch {
      setMesaj(pencere ? "Veli sayfası açıldı." : "Bağlantı hazır. Tarayıcı yeni sekmeyi engelledi.");
    }
    setBekliyor(false);
  }

  return (
    <div className={`flex flex-col gap-1 ${kisa ? "items-start" : "items-end"}`}>
      <button type="button" onClick={gonder} disabled={bekliyor} className="btn btn-birincil btn-kucuk">
        {bekliyor ? "Hazırlanıyor…" : kisa ? "Gönder" : "Veliye gönder"}
      </button>
      {mesaj ? (
        <p className={`text-[12px] text-slate-500 ${kisa ? "max-w-[10rem]" : "max-w-xs text-right"}`}>
          {mesaj}
        </p>
      ) : null}
    </div>
  );
}
