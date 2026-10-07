const sayiBicimi = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const tamSayiBicimi = new Intl.NumberFormat("tr-TR");

const tarihBicimi = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const kisaTarihBicimi = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function net(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return sayiBicimi.format(value);
}

export function puan(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

export function tamSayi(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return tamSayiBicimi.format(value);
}

export function yuzde(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value)}`;
}

export function tarih(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return tarihBicimi.format(new Date(value));
}

export function kisaTarih(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return kisaTarihBicimi.format(new Date(value));
}

/** Form alanlarinda kullanmak icin YYYY-MM-DD */
export function tarihInput(value: Date | string): string {
  const date = new Date(value);
  const ay = String(date.getMonth() + 1).padStart(2, "0");
  const gun = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${ay}-${gun}`;
}

/** Basari yuzdesine gore renk sinifi (dusuk kirmizi, yuksek yesil) */
export function basariRengi(yuzdeDegeri: number | null | undefined): string {
  if (yuzdeDegeri === null || yuzdeDegeri === undefined) return "text-slate-400";
  if (yuzdeDegeri < 25) return "text-rose-600";
  if (yuzdeDegeri < 50) return "text-orange-600";
  if (yuzdeDegeri < 75) return "text-amber-600";
  return "text-emerald-600";
}

/** Basari yuzdesine gore kenarlikli etiket sinifi (duz gorunum icin cerceve dahil) */
export function basariArkaPlani(yuzdeDegeri: number | null | undefined): string {
  if (yuzdeDegeri === null || yuzdeDegeri === undefined) {
    return "border-cerceve bg-slate-50 text-slate-500";
  }
  if (yuzdeDegeri < 25) return "border-rose-200 bg-rose-50 text-rose-700";
  if (yuzdeDegeri < 50) return "border-orange-200 bg-orange-50 text-orange-700";
  if (yuzdeDegeri < 75) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

/** "Anka Derslik" -> "anka-derslik" */
export function slugOlustur(raw: string): string {
  const harfler: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    İ: "i",
    I: "i",
  };
  return raw
    .split("")
    .map((char) => harfler[char] ?? char)
    .join("")
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
