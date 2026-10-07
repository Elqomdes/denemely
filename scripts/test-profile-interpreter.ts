/**
 * Jenerik yorumlayiciyi eldeki Akbim PDF'i uzerinde elle yazilmis bir profil ile dener.
 * GPT cagirmadan interpreter + dogrulama katmanini kanitlar.
 */
import { readFile } from "node:fs/promises";
import { extractPdfPages } from "../lib/pdf/extract";
import { parseAkbimPage } from "../lib/pdf/formats/akbim";
import { profilliAyristir } from "../lib/pdf/profile/learn";
import type { FormatProfile } from "../lib/pdf/profile/schema";
import { dogrulaParsedExam } from "../lib/pdf/profile/validate";

const AKBIM_PROFIL: FormatProfile = {
  id: "test-akbim",
  ad: "Akbim test",
  yayin: "Akbim",
  tespit: {
    zorunlu: ["SINAV\\s+SONUÇ\\s+BELGES", "MEB\\s*KODU"],
    istege_bagli: ["Akbim", "SOYADI"],
  },
  sayfa: {
    kimlikBandi: "tam",
    dersBandi: "tam",
    cevapBandi: "tam",
    kazanimBandi: "tam",
  },
  kimlik: {
    konumDeseni: "/",
    konumMinTop: 0,
    konumMaxTop: 40,
    baslikDeseni: "MEB\\s*KODU",
    adBaslik: "SOYADI",
    noBaslik: "ÖĞR",
    sinifBaslik: "ŞUBE",
    sinavBaslik: "SINAV",
    noYildizdanAyir: true,
    adSinavBasliginiAt: true,
    alternatifAdDeseni: "",
    puanYontem: "etiket_yakin",
    puanEtiket: "PUANLAR",
    puanMin: 50,
    puanMax: 600,
    yuzdelikDeseni: "",
  },
  ders: {
    yontem: "yatay_kolon",
    baslikDeseni: "^DERSLER\\b",
    soruSatir: "SORU SAYISI",
    dogruSatir: "DOĞRU CEVAP",
    yanlisSatir: "YANLIŞ CEVAP",
    bosSatir: "BOŞ CEVAP",
    netSatir: "^NET\\b",
    basariSatir: "BAŞARI ORANI",
    ortSatir: "SINAV NET ORT",
    kuyrukSayi: 0,
    idxSoru: 0,
    idxDogru: 1,
    idxYanlis: 2,
    idxBos: 3,
    idxNet: 4,
    idxBasari: 5,
    idxSinifOrt: -1,
    idxKurumOrt: -1,
    idxGenelOrt: -1,
    toplamEtiket: "",
    yuzdeTokenGerekli: false,
  },
  sira: {
    yontem: "etiketli_satir",
    minTop: 170,
    maxTop: 240,
    genelDesen: "^TÜRKİYE\\b",
    ilDesen: "^İL\\b",
    ilceDesen: "^İLÇE\\b",
    kurumDesen: "\\bKURUM\\b",
    sinifDesen: "^ŞUBE\\b",
    siraIndex: 0,
    katilimIndex: 1,
    katilimBaslik: "",
  },
  cevap: {
    yontem: "etiket_cift",
    anahtarDeseni: "",
    ogrenciDeseni: "ÖĞRENCİ CEVABI",
    ogrenciKonum: "alt",
    dersKaynak: "blok_etiket",
    iptalHarfi: "T",
  },
  kazanim: {
    yontem: "cok_sutun",
    sutunSayisi: 3,
    baslikDeseni: "KONU ADI",
    sayiAdedi: 4,
    sifirSatirDers: true,
    sdybBaslik: false,
  },
};

async function main() {
  const data = new Uint8Array(await readFile("samples/deneme_schema_3.pdf"));
  const pages = await extractPdfPages(data);
  const parsed = profilliAyristir(pages, AKBIM_PROFIL);
  const dogrulama = dogrulaParsedExam(parsed);
  console.log("profil ogrenci", parsed.ogrenciler.length);
  console.log("dogrulama", dogrulama.gecerli, `${dogrulama.basariliSayfa}/${dogrulama.toplamSayfa}`);
  if (dogrulama.hatalar.length) console.log("hatalar", dogrulama.hatalar.slice(0, 8));

  const a = parsed.ogrenciler[0];
  const b = parseAkbimPage(pages[0]);
  console.log("ad", a.ogrenciAdi, "vs", b.ogrenciAdi);
  console.log("puan", a.puan, "vs", b.puan);
  console.log("net", a.toplam.net, "vs", b.toplam.net);
  console.log("ders", a.dersler.length, "vs", b.dersler.length);
  console.log("cvp", a.cevaplar.length, "vs", b.cevaplar.length);
  console.log("kz", a.kazanimlar.length, "vs", b.kazanimlar.length);
  if (!dogrulama.gecerli) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
