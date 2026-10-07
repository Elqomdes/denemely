import { Kart } from "@/components/Kutu";
import { PdfYukleFormu } from "@/components/PdfYukleFormu";
import { SayfaUstu } from "@/components/SayfaUstu";

export const metadata = { title: "Deneme Yükle" };
export const maxDuration = 180;

export default function YuklePage() {
  return (
    <div className="space-y-4">
      <SayfaUstu
        baslik="Deneme yükle"
        meta="Yayının sonuç belgesi PDF'i"
        geri={{ yazi: "Denemeler", yol: "/panel/denemeler" }}
      />

      <Kart>
        <div className="p-4">
          <PdfYukleFormu />
        </div>
      </Kart>

      <div className="text-[13.5px] text-slate-600">
        <p className="font-medium text-slate-800">Okunan belgeler</p>
        <ul className="mt-1 space-y-1">
          <li>
            Sonuç Belgesi — ders tablosunda sınıf / kurum / genel ortalama kolonları olan karneler
          </li>
          <li>Aktif — puanın yanında yüzdelik dilim ve “Cevaplarınız” satırı olan belgeler</li>
          <li>Akbim — “Sınav Sonuç Belgesi”, derslerin yatay kolon olduğu karneler</li>
          <li>Yeni yayın — tanınmayan karneler GPT-5.6 Sol ile bir kez öğrenilir, sonra kayıtlı kalır</li>
        </ul>
        <p className="mt-2 text-slate-500">
          Öğrenme başarısız olursa dosya reddedilir; yanlış sonuç yazılmaz.
        </p>
      </div>
    </div>
  );
}
