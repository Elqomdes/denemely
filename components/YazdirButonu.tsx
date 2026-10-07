"use client";

export function YazdirButonu({
  yazi = "Karneyi yazdır",
  dosyaAdi,
}: {
  yazi?: string;
  dosyaAdi?: string;
}) {
  function yazdir() {
    const eski = document.title;
    if (dosyaAdi) document.title = dosyaAdi;
    window.print();
    window.setTimeout(() => {
      document.title = eski;
    }, 400);
  }

  return (
    <button type="button" onClick={yazdir} className="btn btn-ikincil btn-kucuk">
      {yazi}
    </button>
  );
}
