"use client";

export function YazdirButonu({ yazi = "Karneyi yazdır" }: { yazi?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-ikincil btn-kucuk">
      {yazi}
    </button>
  );
}
