import Link from "next/link";
import { BosDurum, Etiket, Kart } from "@/components/Kutu";
import { BirlestirButonu } from "@/components/ogrenci/BirlestirButonu";
import { SiraTaraButonu } from "@/components/ogrenci/SiraTaraButonu";
import { SayfaUstu } from "@/components/SayfaUstu";
import { kurumOturumuGerekli } from "@/lib/auth/guards";
import { tamSayi } from "@/lib/format";
import { birlestirmeAdaylari } from "@/lib/ogrenci/islemler";
import { farkliKisiler } from "../actions";

export const metadata = { title: "Kayıt Birleştirme" };
export const maxDuration = 120;

const DONUS = "/panel/ogrenciler/birlestir";

export default async function BirlestirSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; tasinan?: string }>;
}) {
  const { kurum } = await kurumOturumuGerekli();
  const [adaylar, { durum, tasinan }] = await Promise.all([
    birlestirmeAdaylari(kurum.id),
    searchParams,
  ]);

  return (
    <div className="space-y-4">
      <SayfaUstu
        baslik="Kayıt birleştirme"
        meta="Aynı öğrencinin farklı yazılmış kayıtları"
        geri={{ yazi: "Öğrenciler", yol: "/panel/ogrenciler" }}
      />

      {durum === "birlestirildi" ? (
        <p className="uyari-serit border-emerald-200 bg-emerald-50 text-emerald-800">
          Kayıtlar birleştirildi{tasinan ? `, ${tasinan} deneme sonucu taşındı` : ""}.
        </p>
      ) : null}
      {durum === "yoksayildi" ? (
        <p className="uyari-serit border-cerceve bg-white text-slate-600">
          Bu ikili farklı kişiler olarak işaretlendi ve listede bir daha gösterilmeyecek.
        </p>
      ) : null}
      {durum === "hatali-secim" ? (
        <p className="uyari-serit border-rose-200 bg-rose-50 text-rose-700">
          Birleştirme için iki farklı kayıt seçilmeli.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cerceve bg-white px-4 py-3">
        <p className="max-w-xl text-[13.5px] text-slate-600">
          Bazı denemelerde ad soyad, bazılarında soyad ad sırasında durur. Tarama aynı kelimeleri
          bulursa kayıtları tek öğrencide birleştirir. Aynı denemede ikisinin de sonucu varsa
          dokunulmaz.
        </p>
        <SiraTaraButonu />
      </div>

      {adaylar.length === 0 ? (
        <BosDurum
          baslik="Birleştirilecek kayıt görünmüyor"
          aciklama="Aynı kişiye ait olduğunu düşündüğünüz iki kayıt varsa öğrenci sayfasındaki düzenleme ekranından elle birleştirebilirsiniz."
          baglantiYazisi="Öğrencilere dön"
          baglantiYolu="/panel/ogrenciler"
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {tamSayi(adaylar.length)} olası eşleşme bulundu. Birleştirmeden önce sınıf ve deneme
            sayılarını kontrol edin.
          </p>

          {adaylar.map((aday) => (
            <Kart key={`${aday.hedef.id}-${aday.kaynak.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cerceve-soluk px-5 py-3">
                <p className="text-sm text-slate-700">{aday.neden}</p>
                {aday.guven === "yuksek" ? (
                  <Etiket ton="olumlu">Güçlü eşleşme</Etiket>
                ) : (
                  <Etiket ton="uyari">İncelenmeli</Etiket>
                )}
              </div>

              <div className="grid gap-px bg-cerceve md:grid-cols-2">
                <KayitKutusu baslik="Korunacak kayıt (varsayılan)" ogrenci={aday.hedef} />
                <KayitKutusu baslik="Kaldırılacak kayıt" ogrenci={aday.kaynak} />
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-cerceve px-5 py-4">
                <BirlestirButonu
                  hedefId={aday.hedef.id}
                  kaynakId={aday.kaynak.id}
                  hedefAd={aday.hedef.adSoyad}
                  kaynakAd={aday.kaynak.adSoyad}
                  kaynakDenemeSayisi={aday.kaynak.denemeSayisi}
                  donus={DONUS}
                />

                <form action={farkliKisiler}>
                  <input type="hidden" name="hedefId" value={aday.hedef.id} />
                  <input type="hidden" name="kaynakId" value={aday.kaynak.id} />
                  <button type="submit" className="btn btn-ikincil btn-kucuk">
                    Farklı kişiler
                  </button>
                </form>
              </div>
            </Kart>
          ))}
        </div>
      )}
    </div>
  );
}

function KayitKutusu({
  baslik,
  ogrenci,
}: {
  baslik: string;
  ogrenci: { id: string; adSoyad: string; sinif: string | null; ogrenciNo: string | null; denemeSayisi: number };
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[12px] text-slate-500">{baslik}</p>
      <Link href={`/panel/ogrenciler/${ogrenci.id}`} className="baglanti mt-1 block text-base">
        {ogrenci.adSoyad}
      </Link>
      <p className="tabular mt-1 text-sm text-slate-600">
        {ogrenci.sinif ?? "Sınıf yok"}
        {ogrenci.ogrenciNo && ogrenci.ogrenciNo !== "0" ? ` · No: ${ogrenci.ogrenciNo}` : ""}
        {" · "}
        {tamSayi(ogrenci.denemeSayisi)} deneme
      </p>
    </div>
  );
}
