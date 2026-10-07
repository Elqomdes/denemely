import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kullanici klasorunde baska bir lockfile oldugu icin kok dizini acikca belirtiyoruz.
  // Aksi halde Turbopack tum kullanici klasorunu izler ve her sayfa saniyelerce surer.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: {
    root: import.meta.dirname,
  },
  // pdfjs-dist ve prisma sunucu tarafinda kendi dosyalarini okur, bundle edilmemeli.
  serverExternalPackages: ["pdfjs-dist", "@prisma/client"],
  experimental: {
    optimizePackageImports: ["recharts"],
    // Dinamik sayfalar varsayilan olarak her geciste yeniden istenir.
    // Bir kez acilan sayfa bu sure boyunca aninda geri gelir.
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
    serverActions: {
      // Bir denemede 30+ ogrencinin PDF'i yuklenebiliyor.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
