import Link from "next/link";
import { Logo } from "@/components/Marka";

export function HalkaSerit({ sag }: { sag?: React.ReactNode }) {
  return (
    <header className="ust-serit">
      <div className="mx-auto flex h-11 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="hover:text-white">
          <Logo boyut="sm" ton="acik" />
        </Link>
        {sag}
      </div>
    </header>
  );
}
