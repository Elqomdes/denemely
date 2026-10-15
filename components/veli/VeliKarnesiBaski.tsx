import { grupKisaAdi } from "@/lib/analiz";
import { kisaTarih, net, puan, tamSayi, tarih, yuzde } from "@/lib/format";

type DersSatir = {
  dersAdi: string;
  dersGrubu: string;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  net: number;
  basariYuzde: number | null;
  sinifOrt?: number | null;
  kurumOrt?: number | null;
};

type KazanimGrup = {
  dersAdi: string;
  dersGrubu: string;
  satirlar: Array<{
    kazanim: string;
    soru: number;
    dogru: number;
    yanlis: number;
    basariYuzde: number | null;
  }>;
};

function basariTon(deger: number | null | undefined) {
  if (deger === null || deger === undefined) return "bos";
  if (deger < 40) return "dusuk";
  if (deger < 70) return "orta";
  return "iyi";
}

function BaskiLogo() {
  return (
    <span className="baski-logo">
      <svg className="baski-logo-isaret" viewBox="0 0 22 22" aria-hidden="true">
        <rect width="22" height="22" rx="4" fill="#312e81" />
        <text
          x="11"
          y="16"
          textAnchor="middle"
          fill="#fff"
          fontSize="12"
          fontWeight="600"
          fontFamily="IBM Plex Sans, Segoe UI, sans-serif"
        >
          D
        </text>
      </svg>
      Denemely
    </span>
  );
}

function BasariHucre({ deger }: { deger: number | null }) {
  const oran = Math.max(0, Math.min(100, deger ?? 0));
  const renk =
    deger === null || deger === undefined
      ? "#94a3b8"
      : deger < 40
        ? "#a63a33"
        : deger < 70
          ? "#8a6710"
          : "#24804f";
  return (
    <span className={`baski-basari baski-basari-${basariTon(deger)}`}>
      <svg className="baski-cubuk" viewBox="0 0 42 5" width="42" height="5" aria-hidden="true">
        <rect width="42" height="5" fill="#e6e8ef" />
        <rect width={42 * (oran / 100)} height="5" fill={renk} />
      </svg>
      {yuzde(deger)}
    </span>
  );
}

export function VeliKarnesiBaski({
  kurumAd,
  ogrenci,
  sinav,
  sonuc,
  gruplar,
  dersler,
  kazanimGruplari,
}: {
  kurumAd: string;
  ogrenci: { adSoyad: string; sinif: string | null; ogrenciNo: string | null };
  sinav: { ad: string; tarih: Date | string; sinavTuru: string };
  sonuc: {
    puan: number | null;
    yuzdelikDilim: number | null;
    toplamDogru: number;
    toplamYanlis: number;
    toplamBos: number;
    toplamNet: number;
    genelSira: number | null;
  };
  gruplar: DersSatir[];
  dersler: DersSatir[];
  kazanimGruplari: KazanimGrup[];
}) {
  const kimlik = [
    ogrenci.sinif,
    ogrenci.ogrenciNo && ogrenci.ogrenciNo !== "0" ? `No ${ogrenci.ogrenciNo}` : null,
    sinav.sinavTuru,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const siraEtiket = sonuc.yuzdelikDilim !== null ? "Yüzdelik" : "Genel sıra";
  const siraDeger =
    sonuc.yuzdelikDilim !== null
      ? yuzde(sonuc.yuzdelikDilim)
      : sonuc.genelSira
        ? tamSayi(sonuc.genelSira)
        : "—";

  return (
    <article className="baski ekran-disi">
      <svg className="baski-serit" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true">
        <rect width="100" height="1" fill="#1e1b4b" />
      </svg>

      <header className="baski-ust">
        <div>
          <BaskiLogo />
          <p className="baski-kurum">{kurumAd}</p>
        </div>
        <div className="baski-ust-sag">
          <p className="baski-belge">{sinav.sinavTuru} veli karnesi</p>
          <p>{kisaTarih(new Date())}</p>
        </div>
      </header>

      <section className="baski-kimlik">
        <h1>{ogrenci.adSoyad}</h1>
        {kimlik ? <p className="baski-meta">{kimlik}</p> : null}
        <div className="baski-sinav">
          <strong>{sinav.ad}</strong>
          <span>{tarih(sinav.tarih)}</span>
        </div>
      </section>

      <dl className="baski-olcutler">
        <div>
          <dt>Net</dt>
          <dd>{net(sonuc.toplamNet)}</dd>
        </div>
        <div>
          <dt>Puan</dt>
          <dd>{puan(sonuc.puan)}</dd>
        </div>
        <div>
          <dt>D / Y / B</dt>
          <dd>
            {tamSayi(sonuc.toplamDogru)}
            <span className="baski-ayrac">/</span>
            {tamSayi(sonuc.toplamYanlis)}
            <span className="baski-ayrac">/</span>
            {tamSayi(sonuc.toplamBos)}
          </dd>
        </div>
        <div>
          <dt>{siraEtiket}</dt>
          <dd>{siraDeger}</dd>
        </div>
      </dl>

      {gruplar.length > 0 ? (
        <section className="baski-bolum">
          <h2>Bölümler</h2>
          <SonucTablosu satirlar={gruplar} kisaAd />
        </section>
      ) : null}

      {dersler.length > 0 ? (
        <section className="baski-bolum">
          <h2>Dersler</h2>
          <SonucTablosu satirlar={dersler} ortalama />
        </section>
      ) : null}

      {kazanimGruplari.length > 0 ? (
        <section className="baski-bolum">
          <h2>Kazanımlar</h2>
          <p className="baski-not">Başarıya göre sıralı. Önce zayıf konular.</p>
          <div className={`baski-kazanimlar${kazanimGruplari.length === 1 ? " baski-kazanimlar-tek" : ""}`}>
            {kazanimGruplari.map((grup) => (
              <section key={`${grup.dersGrubu}-${grup.dersAdi}`} className="baski-kazanim-grup">
                <h3>
                  {grup.dersAdi}
                  {grup.dersAdi !== grupKisaAdi(grup.dersGrubu) ? (
                    <span> {grupKisaAdi(grup.dersGrubu)}</span>
                  ) : null}
                </h3>
                <table className="baski-tablo">
                  <thead>
                    <tr>
                      <th>Kazanım</th>
                      <th className="sayi">S</th>
                      <th className="sayi">D</th>
                      <th className="sayi">Y</th>
                      <th className="sayi">Başarı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grup.satirlar.map((satir) => (
                      <tr key={satir.kazanim}>
                        <td>{satir.kazanim}</td>
                        <td className="sayi">{tamSayi(satir.soru)}</td>
                        <td className="sayi baski-d">{tamSayi(satir.dogru)}</td>
                        <td className="sayi baski-y">{tamSayi(satir.yanlis)}</td>
                        <td className="sayi">
                          <BasariHucre deger={satir.basariYuzde} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="baski-alt">
        <p>
          Bu belge yalnızca {ogrenci.adSoyad} adlı öğrencinin {sinav.ad} sonucunu gösterir.
        </p>
        <p>Hedefly Eğitim Teknolojileri</p>
      </footer>
    </article>
  );
}

function SonucTablosu({
  satirlar,
  ortalama = false,
  kisaAd = false,
}: {
  satirlar: DersSatir[];
  ortalama?: boolean;
  kisaAd?: boolean;
}) {
  return (
    <table className="baski-tablo">
      <thead>
        <tr>
          <th>Ders</th>
          <th className="sayi">Soru</th>
          <th className="sayi">D</th>
          <th className="sayi">Y</th>
          <th className="sayi">B</th>
          <th className="sayi">Net</th>
          <th className="sayi">Başarı</th>
          {ortalama ? (
            <>
              <th className="sayi">Sınıf</th>
              <th className="sayi">Kurum</th>
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {satirlar.map((satir) => {
          const ad = kisaAd ? grupKisaAdi(satir.dersGrubu) : satir.dersAdi;
          const alt = !kisaAd ? grupKisaAdi(satir.dersGrubu) : null;
          return (
            <tr key={`${satir.dersGrubu}-${satir.dersAdi}`}>
              <td>
                {ad}
                {alt && alt !== ad ? <span className="baski-alt-etiket"> {alt}</span> : null}
              </td>
              <td className="sayi">{tamSayi(satir.soru)}</td>
              <td className="sayi baski-d">{tamSayi(satir.dogru)}</td>
              <td className="sayi baski-y">{tamSayi(satir.yanlis)}</td>
              <td className="sayi">{tamSayi(satir.bos)}</td>
              <td className="sayi baski-net">{net(satir.net)}</td>
              <td className="sayi">
                <BasariHucre deger={satir.basariYuzde} />
              </td>
              {ortalama ? (
                <>
                  <td className="sayi">{net(satir.sinifOrt)}</td>
                  <td className="sayi">{net(satir.kurumOrt)}</td>
                </>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
