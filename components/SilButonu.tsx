"use client";

export function SilButonu({
  action,
  gizliAlanAdi,
  gizliDeger,
  onayMesaji,
  yazi = "Sil",
  ekAlanlar,
}: {
  action: (formData: FormData) => Promise<void>;
  gizliAlanAdi: string;
  gizliDeger: string;
  onayMesaji: string;
  yazi?: string;
  ekAlanlar?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(onayMesaji)) event.preventDefault();
      }}
    >
      <input type="hidden" name={gizliAlanAdi} value={gizliDeger} />
      {ekAlanlar
        ? Object.entries(ekAlanlar).map(([ad, deger]) => (
            <input key={ad} type="hidden" name={ad} value={deger} />
          ))
        : null}
      <button type="submit" className="btn btn-tehlike btn-kucuk">
        {yazi}
      </button>
    </form>
  );
}
