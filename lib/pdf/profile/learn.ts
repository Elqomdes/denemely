import type { PdfPage } from "../extract";
import { openaiAnahtari, OpenAIHatasi, profilUret } from "../../openai/client";
import type { ParsedExamFile } from "../types";
import { sayfaDokumu } from "./dump";
import { parseProfilSayfasi } from "./interpreter";
import { slugUret, profilKaydet } from "./store";
import { dogrulaParsedExam, type ProfilDogrulama } from "./validate";
import type { FormatProfile } from "./schema";

export class ProfilOgrenmeHatasi extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfilOgrenmeHatasi";
  }
}

export interface OgrenmeSonucu {
  parsed: ParsedExamFile;
  profil: FormatProfile;
  dogrulama: ProfilDogrulama;
}

const SISTEM = `Sen Denemely için TYT deneme sonuç belgesi şablon mühendisisin.

Görevin: verilen PDF sayfa dökümünden BELİRLEYİCİ bir FormatProfile JSON üretmek.
Sayıları, adları veya netleri sen uydurmayacaksın. Yalnızca tokenların nerede durduğunu tarif edeceksin; kod bu haritayla PDF'ten okuyacak.

Kurallar:
- V1 yalnızca TYT (Türkçe, Sosyal, Matematik, Fen). AYT kolonları soru=0 ise yok sayılır.
- tespit.zorunlu: bu yayını diğerlerinden ayıran 2-5 benzersiz metin/regex. Genel "TYT" tek başına yetmez.
- Regex'ler sayfada GÖRÜNEN metne uymalı. Geçersiz regex yazma.
- Kullanılmayan metin alanlarını boş string, kullanılmayan indeksleri -1 yap.
- Öğrenci adı asla sınav başlığı (TÜRKİYE GENELİ, DENEME, PROVA) olmamalı.
- Cevap anahtarında T harfi iptal sorudur; profil.cevap.iptalHarfi = "T" olsun.
- Her sayfa bir öğrenci karnesidir.
- Puan ve cevap anahtarı ZORUNLU. Cevapsız veya puansız profil reddedilir.
- Satır desenlerinde $ kullanma; satırda başka tokenlar da olur (ör. ÖĞRENCİ CEVABI).
- etiket_cift için sayfa.cevapBandi = "tam" olmalı, her_iki değil.

Yöntem seçimi:
- ders.yatay_kolon: ders adları yatay başlık, altında SORU / DOĞRU / YANLIŞ satırları (Akbim tipi).
- ders.dikey_kuyruk: her ders bir satır, sağda sabit sayıda sayı (Sonuç Belgesi tipi). idx* 0 tabanlı.
- ders.dikey_yuzde: satırda % işaretinden hemen önce 5 sayı: soru doğru yanlış boş net (Aktif tipi).
- kimlik.baslikDeseni + ad/no/sınıf/sınav başlıkları: başlık satırı + alttaki değer satırı, en yakın kolon.
- kimlik.alternatifAdDeseni: sınıf satırından sonraki satır addır (Aktif tipi).
- cevap.etiket_cift: anahtar ve öğrenci cevabı alt alta, ders etiketleri anahtar satırında (TÜRKÇE SOSYAL T.MAT FEN).
- cevap.anahtar_satiri: "Cevap Anahtarı" satırı + cetvel; ogrenciKonum ust|alt.
- kazanim.cok_sutun: sayfa altında 2-3 sütun konu tablosu.
- kazanim.ardisik: tek kolon, ders başlığı + trailing sayılar.
- sira.etiketli_satir: TÜRKİYE / İL / İLÇE / KURUM / ŞUBE satırlarında sıra ve katılım.
- sira.puan_kuyruk: Katılımlar başlığının üst satırında sıralar.

id kısa kebab-case olsun (ornek: koc-tyt-karne). ad insan okunur yayın adı olsun.`;

export async function yeniSablonOgren(
  pages: PdfPage[],
  dosyaAdi?: string,
): Promise<OgrenmeSonucu> {
  if (!openaiAnahtari()) {
    throw new ProfilOgrenmeHatasi(
      "Yeni şablon öğrenmek için OPENAI_API_KEY gerekli. Anahtarı .env dosyasına ekleyin.",
    );
  }
  if (pages.length === 0) {
    throw new ProfilOgrenmeHatasi("PDF sayfası okunamadı.");
  }

  const ornekler = pages.slice(0, Math.min(2, pages.length));
  let onceki: FormatProfile | null = null;
  let sonHata = "";

  for (let deneme = 1; deneme <= 3; deneme += 1) {
    const kullanici = kullaniciIstegi(ornekler, pages.length, dosyaAdi, onceki, sonHata, deneme);
    let profil: FormatProfile;
    try {
      profil = await profilUret({ sistem: SISTEM, kullanici });
    } catch (error) {
      if (error instanceof OpenAIHatasi) {
        throw new ProfilOgrenmeHatasi(
          `Yeni şablon öğrenilemedi: ${error.message}. Dosyayı Hedefly ekibine iletebilirsiniz.`,
        );
      }
      throw error;
    }

    profil.id = slugUret(profil.id || profil.ad || profil.yayin || dosyaAdi || "profil");
    if (!profil.tespit.zorunlu.length) {
      sonHata = "tespit.zorunlu boş kaldı.";
      onceki = profil;
      continue;
    }

    const parsed = profilliAyristir(pages, profil);
    const dogrulama = dogrulaParsedExam(parsed);
    if (dogrulama.gecerli) {
      const kayit = await profilKaydet(profil);
      parsed.profilId = kayit.id;
      parsed.profilAdi = kayit.ad || kayit.id;
      parsed.format = "PROFIL";
      if (dogrulama.uyari.length) parsed.uyarilar.push(...dogrulama.uyari.slice(0, 8));
      parsed.uyarilar.push(`Şablon GPT-5.6 Sol ile öğrenildi: ${kayit.ad}`);
      return { parsed, profil: kayit, dogrulama };
    }

    onceki = profil;
    sonHata = [
      ...dogrulama.hatalar.slice(0, 12),
      ...dogrulama.uyari.slice(0, 6),
    ].join("\n");
  }

  throw new ProfilOgrenmeHatasi(
    "Bu yayın için güvenilir bir şablon çıkarılamadı. Dosyayı Hedefly ekibine iletin; yanlış sonuç yazılmadı.",
  );
}

export function profilliAyristir(pages: PdfPage[], profil: FormatProfile): ParsedExamFile {
  const uyarilar: string[] = [];
  const ogrenciler = [];
  for (const page of pages) {
    const parsed = parseProfilSayfasi(page, profil);
    if (!parsed.ogrenciAdi) {
      uyarilar.push(`${page.pageNumber}. sayfada öğrenci adı okunamadı, sayfa atlandı.`);
      continue;
    }
    ogrenciler.push(parsed);
  }
  return {
    format: "PROFIL",
    sinavAdi: ogrenciler.find((o) => o.sinavAdi)?.sinavAdi ?? null,
    ogrenciler,
    uyarilar,
    profilId: profil.id,
    profilAdi: profil.ad,
  };
}

function kullaniciIstegi(
  ornekler: PdfPage[],
  toplamSayfa: number,
  dosyaAdi: string | undefined,
  onceki: FormatProfile | null,
  sonHata: string,
  deneme: number,
): string {
  const dokumler = ornekler.map((page) => sayfaDokumu(page)).join("\n\n----\n\n");
  const onarim =
    onceki && sonHata
      ? `\n\nÖNCEKİ PROFİL (deneme ${deneme - 1}, başarısız):\n${JSON.stringify(onceki, null, 2)}\n\nDOĞRULAMA HATALARI:\n${sonHata}\n\nProfili bu hatalara göre düzelt. Aynı hatayı tekrarlama.`
      : "";

  return `Dosya: ${dosyaAdi ?? "bilinmiyor"}
Toplam sayfa / öğrenci: ${toplamSayfa}
Deneme: ${deneme}/3

Her satır: sıra y<top> token@x-endX
Koordinatlar PDF punto birimi, y aşağı artar.

${dokumler}${onarim}`;
}

