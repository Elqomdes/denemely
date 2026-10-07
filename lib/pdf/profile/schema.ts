/**
 * Yeni bir yayın karnesi için GPT-5.6 Sol'un ürettiği belirleyici harita.
 * Sayılar modelden değil, bu haritayla PDF tokenlarından okunur.
 */

export type KolonBandi = "tam" | "sol" | "sag" | "her_iki";
export type KimlikBandi = "tam" | "sol" | "sag";
export type DersYontem = "yatay_kolon" | "dikey_kuyruk" | "dikey_yuzde";
export type PuanYontem = "etiket_yakin" | "tek_ondalik" | "yok";
export type SiraYontem = "etiketli_satir" | "puan_kuyruk" | "yok";
export type CevapYontem = "etiket_cift" | "anahtar_satiri" | "yok";
export type KazanimYontem = "cok_sutun" | "ardisik" | "yok";
export type OgrenciKonum = "ust" | "alt";
export type DersKaynak = "blok_etiket" | "onceki_grup" | "satir_basi";

export interface FormatProfile {
  id: string;
  ad: string;
  yayin: string;
  tespit: {
    zorunlu: string[];
    istege_bagli: string[];
  };
  sayfa: {
    kimlikBandi: KimlikBandi;
    dersBandi: KolonBandi;
    cevapBandi: KolonBandi;
    kazanimBandi: KolonBandi;
  };
  kimlik: {
    konumDeseni: string;
    konumMinTop: number;
    konumMaxTop: number;
    baslikDeseni: string;
    adBaslik: string;
    noBaslik: string;
    sinifBaslik: string;
    sinavBaslik: string;
    noYildizdanAyir: boolean;
    adSinavBasliginiAt: boolean;
    alternatifAdDeseni: string;
    puanYontem: PuanYontem;
    puanEtiket: string;
    puanMin: number;
    puanMax: number;
    yuzdelikDeseni: string;
  };
  ders: {
    yontem: DersYontem;
    baslikDeseni: string;
    soruSatir: string;
    dogruSatir: string;
    yanlisSatir: string;
    bosSatir: string;
    netSatir: string;
    basariSatir: string;
    ortSatir: string;
    kuyrukSayi: number;
    idxSoru: number;
    idxDogru: number;
    idxYanlis: number;
    idxBos: number;
    idxNet: number;
    idxBasari: number;
    idxSinifOrt: number;
    idxKurumOrt: number;
    idxGenelOrt: number;
    toplamEtiket: string;
    yuzdeTokenGerekli: boolean;
  };
  sira: {
    yontem: SiraYontem;
    minTop: number;
    maxTop: number;
    genelDesen: string;
    ilDesen: string;
    ilceDesen: string;
    kurumDesen: string;
    sinifDesen: string;
    siraIndex: number;
    katilimIndex: number;
    katilimBaslik: string;
  };
  cevap: {
    yontem: CevapYontem;
    anahtarDeseni: string;
    ogrenciDeseni: string;
    ogrenciKonum: OgrenciKonum;
    dersKaynak: DersKaynak;
    iptalHarfi: string;
  };
  kazanim: {
    yontem: KazanimYontem;
    sutunSayisi: number;
    baslikDeseni: string;
    sayiAdedi: number;
    sifirSatirDers: boolean;
    sdybBaslik: boolean;
  };
}

const STR = { type: "string" as const };
const NUM = { type: "number" as const };
const BOOL = { type: "boolean" as const };

function strEnum<T extends string>(values: T[]) {
  return { type: "string" as const, enum: values };
}

function obj<T extends Record<string, unknown>>(properties: T) {
  return {
    type: "object" as const,
    additionalProperties: false as const,
    properties,
    required: Object.keys(properties),
  };
}

/** OpenAI Structured Outputs (strict) ile birebir uyumlu şema. */
export const FORMAT_PROFILE_JSON_SCHEMA = obj({
  id: STR,
  ad: STR,
  yayin: STR,
  tespit: obj({
    zorunlu: { type: "array", items: STR },
    istege_bagli: { type: "array", items: STR },
  }),
  sayfa: obj({
    kimlikBandi: strEnum(["tam", "sol", "sag"]),
    dersBandi: strEnum(["tam", "sol", "sag", "her_iki"]),
    cevapBandi: strEnum(["tam", "sol", "sag", "her_iki"]),
    kazanimBandi: strEnum(["tam", "sol", "sag", "her_iki"]),
  }),
  kimlik: obj({
    konumDeseni: STR,
    konumMinTop: NUM,
    konumMaxTop: NUM,
    baslikDeseni: STR,
    adBaslik: STR,
    noBaslik: STR,
    sinifBaslik: STR,
    sinavBaslik: STR,
    noYildizdanAyir: BOOL,
    adSinavBasliginiAt: BOOL,
    alternatifAdDeseni: STR,
    puanYontem: strEnum(["etiket_yakin", "tek_ondalik", "yok"]),
    puanEtiket: STR,
    puanMin: NUM,
    puanMax: NUM,
    yuzdelikDeseni: STR,
  }),
  ders: obj({
    yontem: strEnum(["yatay_kolon", "dikey_kuyruk", "dikey_yuzde"]),
    baslikDeseni: STR,
    soruSatir: STR,
    dogruSatir: STR,
    yanlisSatir: STR,
    bosSatir: STR,
    netSatir: STR,
    basariSatir: STR,
    ortSatir: STR,
    kuyrukSayi: NUM,
    idxSoru: NUM,
    idxDogru: NUM,
    idxYanlis: NUM,
    idxBos: NUM,
    idxNet: NUM,
    idxBasari: NUM,
    idxSinifOrt: NUM,
    idxKurumOrt: NUM,
    idxGenelOrt: NUM,
    toplamEtiket: STR,
    yuzdeTokenGerekli: BOOL,
  }),
  sira: obj({
    yontem: strEnum(["etiketli_satir", "puan_kuyruk", "yok"]),
    minTop: NUM,
    maxTop: NUM,
    genelDesen: STR,
    ilDesen: STR,
    ilceDesen: STR,
    kurumDesen: STR,
    sinifDesen: STR,
    siraIndex: NUM,
    katilimIndex: NUM,
    katilimBaslik: STR,
  }),
  cevap: obj({
    yontem: strEnum(["etiket_cift", "anahtar_satiri", "yok"]),
    anahtarDeseni: STR,
    ogrenciDeseni: STR,
    ogrenciKonum: strEnum(["ust", "alt"]),
    dersKaynak: strEnum(["blok_etiket", "onceki_grup", "satir_basi"]),
    iptalHarfi: STR,
  }),
  kazanim: obj({
    yontem: strEnum(["cok_sutun", "ardisik", "yok"]),
    sutunSayisi: NUM,
    baslikDeseni: STR,
    sayiAdedi: NUM,
    sifirSatirDers: BOOL,
    sdybBaslik: BOOL,
  }),
});

export function bosProfil(ad = "Yeni sablon"): FormatProfile {
  return {
    id: "",
    ad,
    yayin: "",
    tespit: { zorunlu: [], istege_bagli: [] },
    sayfa: {
      kimlikBandi: "tam",
      dersBandi: "tam",
      cevapBandi: "tam",
      kazanimBandi: "tam",
    },
    kimlik: {
      konumDeseni: "",
      konumMinTop: -1,
      konumMaxTop: -1,
      baslikDeseni: "",
      adBaslik: "",
      noBaslik: "",
      sinifBaslik: "",
      sinavBaslik: "",
      noYildizdanAyir: false,
      adSinavBasliginiAt: true,
      alternatifAdDeseni: "",
      puanYontem: "yok",
      puanEtiket: "",
      puanMin: 50,
      puanMax: 600,
      yuzdelikDeseni: "",
    },
    ders: {
      yontem: "dikey_kuyruk",
      baslikDeseni: "",
      soruSatir: "",
      dogruSatir: "",
      yanlisSatir: "",
      bosSatir: "",
      netSatir: "",
      basariSatir: "",
      ortSatir: "",
      kuyrukSayi: 6,
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
      yontem: "yok",
      minTop: -1,
      maxTop: -1,
      genelDesen: "",
      ilDesen: "",
      ilceDesen: "",
      kurumDesen: "",
      sinifDesen: "",
      siraIndex: 0,
      katilimIndex: 1,
      katilimBaslik: "",
    },
    cevap: {
      yontem: "yok",
      anahtarDeseni: "",
      ogrenciDeseni: "",
      ogrenciKonum: "alt",
      dersKaynak: "satir_basi",
      iptalHarfi: "T",
    },
    kazanim: {
      yontem: "yok",
      sutunSayisi: 1,
      baslikDeseni: "",
      sayiAdedi: 4,
      sifirSatirDers: true,
      sdybBaslik: false,
    },
  };
}

