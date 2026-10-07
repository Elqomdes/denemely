"use client";

export function SilButonu({
  action,
  gizliAlanAdi,
  gizliDeger,
  onayMesaji,
  yazi = "Sil",
}: {
  action: (formData: FormData) => Promise<void>;
  gizliAlanAdi: string;
  gizliDeger: string;
  onayMesaji: string;
  yazi?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(onayMesaji)) event.preventDefault();
      }}
    >
      <input type="hidden" name={gizliAlanAdi} value={gizliDeger} />
      <button type="submit" className="btn btn-tehlike btn-kucuk">
        {yazi}
      </button>
    </form>
  );
}
