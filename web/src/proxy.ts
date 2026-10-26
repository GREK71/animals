import { NextResponse, type NextRequest } from "next/server";

// 낙관적 검사: 세션 쿠키가 없으면 로그인으로. 실제 검증은 각 화면의 requireUser()가 한다.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname === "/api/login") return NextResponse.next();
  if (!req.cookies.has("ah_session")) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|icon|.*\\..*).*)"],
};
