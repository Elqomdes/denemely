/** Kullanici adlari yalnizca ASCII a-z0-9._- ; Turkce I/ı giriste kaydi kacirmasin. */
export function kullaniciAdiniNormallestir(ham: string): string {
  return ham
    .trim()
    .replaceAll("İ", "i")
    .replaceAll("I", "i")
    .replaceAll("ı", "i")
    .toLowerCase();
}
