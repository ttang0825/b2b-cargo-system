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

  // 직원 계정 테이블에서 재직 상태를 확인 - 퇴사(inactive) 처리된 계정은 세션이 있어도 차단
  const { data: staff } = await supabase
    .from("staff_accounts")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff || staff.status !== "active") {
    await supabase.auth.signOut();
    return redirectToLogin("inactive");
  }

  return response;
}

// /admin 이하 모든 경로에만 이 미들웨어가 적용됩니다 (API 라우트 등은 영향받지 않음)
export const config = {
  matcher: ["/admin/:path*"],
};
