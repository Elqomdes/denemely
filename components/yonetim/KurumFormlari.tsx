"use client";

import { useActionState } from "react";
import { kurumGuncelle, kurumOlustur, type FormDurumu } from "@/app/yonetim/actions";
import { DurumMesaji, GonderButonu, MetinAlani } from "./Alanlar";

export function KurumOlusturFormu() {
  const [durum, formAction, bekliyor] = useActionState<FormDurumu, FormData>(kurumOlustur, {});

  return (
    <form action={formAction} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <MetinAlani ad="ad" etiket="Kurum adı" gerekli yerTutucu="Anka Derslik" />
        <MetinAlani
          ad="slug"
          etiket="Giriş sayfası adresi"
          ipucu="Boş bırakırsanız kurum adından üretilir. Örnek: /k/anka-derslik"
          yerTutucu="anka-derslik"
        />
        <MetinAlani ad="il" etiket="İl" yerTutucu="BOLU" />
        <MetinAlani ad="ilce" etiket="İlçe" yerTutucu="BOLU MERKEZ" />
      </div>
      <MetinAlani
        ad="logoUrl"
        etiket="Logo adresi"
        yerTutucu="https://"
        ipucu="Kurumun giriş sayfasında gösterilecek logonun bağlantısı (isteğe bağlı)."
      />
      <MetinAlani
        ad="notlar"
        etiket="İç not"
        cokSatir
        enCokUzunluk={2000}
        yerTutucu="Sözleşme, paket, iletişim…"
        ipucu="Yalnızca Hedefly yönetiminde görünür."
      />

      <DurumMesaji durum={durum} />
      <div className="border-t border-cerceve-soluk pt-4">
        <GonderButonu bekliyor={bekliyor} yazi="Kurumu oluştur" bekleyenYazi="Oluşturuluyor…" />
      </div>
    </form>
  );
}

export function KurumDuzenleFormu({
  kurum,
}: {
  kurum: {
    id: string;
    ad: string;
    slug: string;
    il: string | null;
    ilce: string | null;
    logoUrl: string | null;
    notlar: string | null;
    aktif: boolean;
  };
}) {
  const [durum, formAction, bekliyor] = useActionState<FormDurumu, FormData>(kurumGuncelle, {});

  return (
    <form action={formAction} className="space-y-4 p-5">
      <input type="hidden" name="id" value={kurum.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetinAlani ad="ad" etiket="Kurum adı" gerekli varsayilan={kurum.ad} />
        <MetinAlani
          ad="slug"
          etiket="Giriş sayfası adresi"
          gerekli
          varsayilan={kurum.slug}
          ipucu="Değiştirirseniz eski /k/… bağlantısı çalışmaz; yenisini kuruma iletin."
        />
        <MetinAlani ad="il" etiket="İl" varsayilan={kurum.il} />
        <MetinAlani ad="ilce" etiket="İlçe" varsayilan={kurum.ilce} />
      </div>

      <MetinAlani
        ad="logoUrl"
        etiket="Logo adresi"
        varsayilan={kurum.logoUrl}
        yerTutucu="https://"
      />
      <MetinAlani
        ad="notlar"
        etiket="İç not"
        cokSatir
        enCokUzunluk={2000}
        varsayilan={kurum.notlar}
        ipucu="Yalnızca Hedefly yönetiminde görünür."
      />

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="aktif"
          defaultChecked={kurum.aktif}
          className="h-4 w-4 rounded-sm border-cerceve text-marka-700"
        />
        Kurum erişimi aktif
      </label>

      <DurumMesaji durum={durum} />
      <div className="border-t border-cerceve-soluk pt-4">
        <GonderButonu
          bekliyor={bekliyor}
          yazi="Değişiklikleri kaydet"
          bekleyenYazi="Kaydediliyor…"
        />
      </div>
    </form>
  );
}
