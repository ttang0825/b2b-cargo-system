import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 로그인 페이지 자체는 항상 통과시켜야 무한 리다이렉트가 발생하지 않습니다.
const PUBLIC_PATHS = ["/admin/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response;
  }

  function redirectToLogin(reason?: string) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    if (reason) loginUrl.searchParams.set("error", reason);
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToLogin();
  }

  // role/status는 staff_accounts 변경 시(app/api/admin/staff/route.ts) auth의
  // user_metadata에도 같이 미러링해두므로, getUser() 응답에 이미 최신 값이 들어있으면
  // 페이지 이동마다 staff_accounts를 또 조회할 필요가 없음. 아직 미러링 전인
  // 레거시 계정(둘 중 하나라도 비어있는 경우)만 예전처럼 DB에서 직접 조회
  let status = user.user_metadata?.status as string | undefined;
  let role = user.user_metadata?.role as string | undefined;

  if (!status || !role) {
    const { data: staff } = await supabase
      .from("staff_accounts")
      .select("status,role")
      .eq("id", user.id)
      .maybeSingle();
    if (!staff) {
      await supabase.auth.signOut();
      return redirectToLogin("inactive");
    }
    status = staff.status;
    role = staff.role;
  }

  // 재직 상태 확인 - 퇴사(inactive) 처리된 계정은 세션이 있어도 차단
  if (status !== "active") {
    await supabase.auth.signOut();
    return redirectToLogin("inactive");
  }

  // 직원 계정 관리 · 지원접속 이력 화면은 관리자만 접근 가능
  if (
    (pathname.startsWith("/admin/staff") || pathname.startsWith("/admin/support-logs")) &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return response;
}

// /admin 이하 모든 경로에만 이 미들웨어가 적용됩니다 (API 라우트 등은 영향받지 않음)
export const config = {
  matcher: ["/admin/:path*"],
};
