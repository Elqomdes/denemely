import { revalidateTag, unstable_cache } from "next/cache";

export function kurumOnbellekEtiketi(institutionId: string) {
  return `kurum-${institutionId}`;
}

export function kurumOnbellekYenile(institutionId: string) {
  revalidateTag(kurumOnbellekEtiketi(institutionId));
}

/** Ayni kurumda tekrarlanan panel sorgularini kisa sure bellekler. */
export function kurumSorgusu<T>(
  anahtar: string[],
  institutionId: string,
  hesapla: () => Promise<T>,
): Promise<T> {
  return unstable_cache(hesapla, anahtar, {
    revalidate: 120,
    tags: [kurumOnbellekEtiketi(institutionId)],
  })();
}
