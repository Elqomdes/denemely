import { NextResponse, type NextRequest } from "next/server";
import { ROLLER } from "@/lib/auth/roller";
import { OTURUM_COOKIE, oturumTokeniDogrula } from "@/lib/auth/token";

/**
 * Panel ve yonetim alanlarina oturumsuz erisimi engeller.
 * Veritabani kontrolleri sunucu bilesenlerindeki guard'larda yapiliyor.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(OTURUM_COOKIE)?.value;
  const oturum = token ? await oturumTokeniDogrula(token) : null;

  if (!oturum) {
    const girisUrl = new URL("/giris", request.url);
    girisUrl.searchParams.set("devam", pathname);
    return NextResponse.redirect(girisUrl);
  }

  if (pathname.startsWith("/yonetim") && oturum.rol !== ROLLER.SUPERADMIN) {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  if (pathname.startsWith("/panel") && oturum.rol === ROLLER.SUPERADMIN) {
    return NextResponse.redirect(new URL("/yonetim", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel", "/panel/:path*", "/yonetim", "/yonetim/:path*"],
};
