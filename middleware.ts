import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 로그인 페이지 자체는 항상 통과시켜야 무한 리다이렉트가 발생하지 않습니다.
const PUBLIC_PATHS = ["/admin/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get("admin_auth")?.value;
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || authCookie !== expected) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// /admin 이하 모든 경로에만 이 미들웨어가 적용됩니다 (API 라우트 등은 영향받지 않음)
export const config = {
  matcher: ["/admin/:path*"],
};
