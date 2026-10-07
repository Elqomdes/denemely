export function Logo({
  boyut = "md",
  ton = "koyu",
}: {
  boyut?: "sm" | "md" | "lg";
  ton?: "koyu" | "acik";
}) {
  const olcu = {
    sm: { kutu: "h-7 w-7 text-[13px]", yazi: "text-[16px]" },
    md: { kutu: "h-8 w-8 text-[14px]", yazi: "text-[18px]" },
    lg: { kutu: "h-10 w-10 text-[17px]", yazi: "text-[23px]" },
  }[boyut];

  const renk = ton === "acik" ? "text-white" : "text-slate-950";

  return (
    <span className={`inline-flex items-center gap-2.5 ${olcu.yazi} ${renk} font-semibold tracking-[-0.025em]`}>
      <span
        className={`${olcu.kutu} grid place-items-center rounded-lg bg-gradient-to-br from-marka-500 to-cyan-400 font-semibold text-white shadow-[0_6px_16px_rgba(79,70,229,0.28)]`}
        aria-hidden="true"
      >
        D
      </span>
      Denemely
    </span>
  );
}

export function HedeflyImza({
  className = "",
  ton = "koyu",
}: {
  className?: string;
  ton?: "koyu" | "acik";
}) {
  return (
    <p className={`text-[12px] ${ton === "acik" ? "text-marka-200" : "text-slate-500"} ${className}`}>
      Hedefly Eğitim Teknolojileri
    </p>
  );
}
