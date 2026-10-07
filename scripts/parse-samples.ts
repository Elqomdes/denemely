/**
 * Ornek PDF'ler uzerinde ayristiricilari dogrular.
 *
 *   npm run parse:samples
 *
 * Kontroller: ogrenci sayisi, net = dogru - yanlis/4, bos = soru - dogru - yanlis,
 * cevap dizisi uzunlugu = cevap anahtari uzunlugu, buyuk/kucuk harf sayilari ile
 * dogru/yanlis sayilarinin tutarliligi.
 */
import { readFile } from "node:fs/promises";
import { parseExamPdf } from "../lib/pdf/parseExamPdf";
import type { ParsedStudentPage } from "../lib/pdf/types";

const DOSYALAR = [
  { yol: "samples/deneme_schema_1.pdf", beklenenOgrenci: 25 },
  { yol: "samples/deneme_schema_2.pdf", beklenenOgrenci: 27 },
  { yol: "samples/deneme_schema_3.pdf", beklenenOgrenci: 26 },
];

let hataSayisi = 0;

function hata(mesaj: string) {
  hataSayisi += 1;
  console.log(`   HATA: ${mesaj}`);
}

function yaklasikEsit(a: number, b: number, tolerans = 0.01) {
  return Math.abs(a - b) <= tolerans;
}

function ogrenciDogrula(ogrenci: ParsedStudentPage) {
  const etiket = `s${ogrenci.pageNumber} ${ogrenci.ogrenciAdi}`;

  for (const ders of ogrenci.dersler) {
    const beklenenNet = ders.dogru - ders.yanlis / 4;
    if (!yaklasikEsit(ders.net, beklenenNet)) {
      hata(`${etiket} / ${ders.dersAdi}: net ${ders.net}, beklenen ${beklenenNet}`);
    }
    const beklenenBos = ders.soru - ders.dogru - ders.yanlis;
    if (ders.bos !== beklenenBos) {
      hata(`${etiket} / ${ders.dersAdi}: bos ${ders.bos}, beklenen ${beklenenBos}`);
    }
  }

  const beklenenToplamNet = ogrenci.toplam.dogru - ogrenci.toplam.yanlis / 4;
  if (!yaklasikEsit(ogrenci.toplam.net, beklenenToplamNet)) {
    hata(`${etiket}: toplam net ${ogrenci.toplam.net}, beklenen ${beklenenToplamNet}`);
  }

  // Ogrenci bir bolumu hic isaretlemediyse yayin o bolumu basmiyor; bu yuzden
  // 4 ders grubunun tamami her karnede bulunmayabiliyor.
  const gruplar = ogrenci.dersler.filter((d) => d.isGrup);
  const grupSoruToplami = gruplar.reduce((s, d) => s + d.soru, 0);
  if (gruplar.length === 4 && grupSoruToplami !== ogrenci.toplam.soru) {
    hata(
      `${etiket}: grup soru toplami ${grupSoruToplami}, toplam satiri ${ogrenci.toplam.soru}`,
    );
  }
  if (gruplar.length === 0) hata(`${etiket}: hic ders grubu bulunamadi`);
  if (gruplar.length < 4) {
    console.log(
      `   NOT: ${etiket} karnesinde ${gruplar.length} ders grubu var (eksik bolum isaretlenmemis).`,
    );
  }

  if (ogrenci.cevaplar.length !== gruplar.length) {
    hata(
      `${etiket}: ${gruplar.length} ders grubu icin ${ogrenci.cevaplar.length} cevap blogu bulundu`,
    );
  }
  const grupAdlari = new Set(ogrenci.cevaplar.map((c) => c.dersGrubu));
  if (grupAdlari.size !== ogrenci.cevaplar.length) {
    hata(`${etiket}: cevap bloklari ayni ders grubuna atanmis`);
  }

  for (const cevap of ogrenci.cevaplar) {
    if (cevap.ogrenciCevaplari.length !== cevap.cevapAnahtari.length) {
      hata(
        `${etiket} / ${cevap.dersGrubu}: cevap uzunlugu ${cevap.ogrenciCevaplari.length}, anahtar ${cevap.cevapAnahtari.length}`,
      );
      continue;
    }
    if (!/^[A-ET]+$/.test(cevap.cevapAnahtari)) {
      hata(`${etiket} / ${cevap.dersGrubu}: cevap anahtari beklenmedik karakter iceriyor`);
    }

    const buyuk = [...cevap.ogrenciCevaplari].filter((c) => /[A-E]/.test(c)).length;
    const kucuk = [...cevap.ogrenciCevaplari].filter((c) => /[a-e]/.test(c)).length;
    const grup = gruplar.find((g) => g.dersGrubu === cevap.dersGrubu);
    if (grup && (buyuk !== grup.dogru || kucuk !== grup.yanlis)) {
      hata(
        `${etiket} / ${cevap.dersGrubu}: cevap dizisi ${buyuk} dogru/${kucuk} yanlis, tablo ${grup.dogru}/${grup.yanlis}`,
      );
    }

    // Buyuk harfler anahtarla ayni olmali, kucuk harfler farkli olmali.
    for (let i = 0; i < cevap.ogrenciCevaplari.length; i++) {
      const verilen = cevap.ogrenciCevaplari[i];
      if (verilen === " ") continue;
      const dogruCevap = cevap.cevapAnahtari[i];
      const buyukHarf = verilen.toUpperCase();
      if (dogruCevap === "T") continue;
      if (/[A-E]/.test(verilen) && buyukHarf !== dogruCevap) {
        hata(
          `${etiket} / ${cevap.dersGrubu}: ${i + 1}. soru dogru isaretlenmis ama anahtar ${dogruCevap}, cevap ${verilen}`,
        );
        break;
      }
      if (/[a-e]/.test(verilen) && buyukHarf === dogruCevap) {
        hata(
          `${etiket} / ${cevap.dersGrubu}: ${i + 1}. soru yanlis isaretlenmis ama anahtarla ayni (${verilen})`,
        );
        break;
      }
    }
  }

  const kazanimSoruToplami = ogrenci.kazanimlar.reduce((s, k) => s + k.soru, 0);
  if (ogrenci.kazanimlar.length === 0) {
    hata(`${etiket}: kazanim analizi bos`);
  }
  return { kazanimSoruToplami };
}

function ozetYaz(ogrenci: ParsedStudentPage) {
  console.log(
    [
      `   ${String(ogrenci.pageNumber).padStart(2)}.`,
      ogrenci.ogrenciAdi.padEnd(24),
      `${ogrenci.sinif ?? "-"}`.padEnd(9),
      `puan ${String(ogrenci.puan ?? "-").padStart(7)}`,
      `net ${String(ogrenci.toplam.net).padStart(6)}`,
      `D${String(ogrenci.toplam.dogru).padStart(3)}`,
      `Y${String(ogrenci.toplam.yanlis).padStart(3)}`,
      `B${String(ogrenci.toplam.bos).padStart(3)}`,
      `ders ${String(ogrenci.dersler.length).padStart(2)}`,
      `kazanim ${String(ogrenci.kazanimlar.length).padStart(3)}`,
      ogrenci.yuzdelikDilim !== null ? `dilim %${ogrenci.yuzdelikDilim}` : `genel sira ${ogrenci.siralar.genel ?? "-"}`,
    ].join("  "),
  );
}

function detayYaz(ogrenci: ParsedStudentPage) {
  console.log(`\n   --- Ilk ogrenci detayi: ${ogrenci.ogrenciAdi} ---`);
  console.log(
    `   Kurum: ${ogrenci.kurumAdi} | ${ogrenci.il} / ${ogrenci.ilce} | Sinav: ${ogrenci.sinavAdi}`,
  );
  console.log(
    `   No: ${ogrenci.ogrenciNo} | Sinif: ${ogrenci.sinif} | Puan: ${ogrenci.puan} | Genel ort: ${ogrenci.genelOrtalamaPuan} | Dilim: ${ogrenci.yuzdelikDilim}`,
  );
  console.log(
    `   Siralar: snf ${ogrenci.siralar.sinif} kurum ${ogrenci.siralar.kurum} ilce ${ogrenci.siralar.ilce} il ${ogrenci.siralar.il} genel ${ogrenci.siralar.genel}`,
  );
  console.log(
    `   Katilim: snf ${ogrenci.katilimlar.sinif} kurum ${ogrenci.katilimlar.kurum} ilce ${ogrenci.katilimlar.ilce} il ${ogrenci.katilimlar.il} genel ${ogrenci.katilimlar.genel}`,
  );
  for (const ders of ogrenci.dersler) {
    console.log(
      `   ${ders.isGrup ? "*" : " "} ${ders.dersAdi.padEnd(22)} ${ders.dersGrubu.padEnd(14)} S${String(ders.soru).padStart(3)} D${String(ders.dogru).padStart(3)} Y${String(ders.yanlis).padStart(3)} B${String(ders.bos).padStart(3)} net ${String(ders.net).padStart(6)} %${ders.basariYuzde ?? "-"}`,
    );
  }
  for (const cevap of ogrenci.cevaplar) {
    console.log(`   ${cevap.dersGrubu} (kitapcik ${cevap.kitapcik ?? "-"})`);
    console.log(`     anahtar : ${cevap.cevapAnahtari}`);
    console.log(`     ogrenci : ${cevap.ogrenciCevaplari}`);
  }
  console.log(`   Ilk 5 kazanim:`);
  for (const kazanim of ogrenci.kazanimlar.slice(0, 5)) {
    console.log(
      `     ${kazanim.dersAdi} | ${kazanim.kazanim} | S${kazanim.soru} D${kazanim.dogru} Y${kazanim.yanlis} %${kazanim.basariYuzde}`,
    );
  }
  if (ogrenci.uyarilar.length > 0) {
    console.log(`   Uyarilar: ${ogrenci.uyarilar.join(" | ")}`);
  }
}

async function main() {
  let toplamOgrenci = 0;

  for (const dosya of DOSYALAR) {
    console.log(`\n=== ${dosya.yol}`);
    const data = new Uint8Array(await readFile(dosya.yol));
    const sonuc = await parseExamPdf(data, dosya.yol);

    console.log(`   Format: ${sonuc.format} | Sinav adi: ${sonuc.sinavAdi}`);
    console.log(`   Ogrenci sayisi: ${sonuc.ogrenciler.length} (beklenen ${dosya.beklenenOgrenci})`);
    if (sonuc.ogrenciler.length !== dosya.beklenenOgrenci) {
      hata(`${dosya.yol}: ${dosya.beklenenOgrenci} ogrenci bekleniyordu`);
    }
    if (sonuc.uyarilar.length > 0) console.log(`   Dosya uyarilari: ${sonuc.uyarilar.join(" | ")}`);

    for (const ogrenci of sonuc.ogrenciler) {
      ozetYaz(ogrenci);
      ogrenciDogrula(ogrenci);
    }

    const uyariliOgrenciler = sonuc.ogrenciler.filter((o) => o.uyarilar.length > 0);
    if (uyariliOgrenciler.length > 0) {
      console.log(`   Uyari veren ogrenci sayisi: ${uyariliOgrenciler.length}`);
      for (const ogrenci of uyariliOgrenciler.slice(0, 5)) {
        console.log(`     ${ogrenci.ogrenciAdi}: ${ogrenci.uyarilar.join(" | ")}`);
      }
    }

    if (sonuc.ogrenciler[0]) detayYaz(sonuc.ogrenciler[0]);
    toplamOgrenci += sonuc.ogrenciler.length;
  }

  console.log(`\n=== Toplam ${toplamOgrenci} ogrenci ayristirildi.`);
  if (hataSayisi > 0) {
    console.log(`=== ${hataSayisi} hata bulundu.`);
    process.exit(1);
  }
  console.log("=== Tum kontroller basarili.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
