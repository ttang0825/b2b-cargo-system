import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 로그인 페이지 자체는 항상 통과시켜야 무한 리다이렉트가 발생하지 않습니다.
//
// 🔴 **이 목록을 줄이면 설치형 앱이 조용히 망가진다.** 아래 정적 자원은 로그인과
// 무관하게 항상 내려가야 하는데, matcher 가 이 세그먼트 전체를 잡아서 빼면
// 브라우저 요청에 로그인 화면이 대신 내려온다(응답이 307 이라 화면으로는 안 보이고
// 「아이콘이 안 뜬다」·「설치 버튼이 안 뜬다」로만 나타나 원인을 찾기 어렵다).
// 인증 정보가 담긴 파일이 아니라 단순 정적 자원이므로 공개해도 문제 없다.
//
//   icon.svg        탭 파비콘. 28차 PR #77 리뷰에서 실제로 겪은 사고다
//   apple-icon.png  아이폰 홈 화면 아이콘. 파일 컨벤션이라 이 세그먼트에만 둘 수 있다
//   sw.js           설치형 앱의 서비스워커. 스크립트 위치가 곧 담당 구역이라
//                   루트로 옮길 수 없다(옮기면 구역이 사이트 전체가 된다)
//
// 🔴 이 세그먼트 아래에 파일 컨벤션 에셋(opengraph-image 등)이나 정적 파일을 더 두면
//    **여기에 함께 추가할 것.** 반대로 화면·API 경로는 절대 넣지 말 것 — 그 순간
//    로그인 없이 열린다.
// 🟢 manifest 는 이 목록에 없다. 루트(`public/`)에 두어 matcher 자체를 피했다.
const PUBLIC_PATHS = [
  "/admin/login",
  "/admin/icon.svg",
  "/admin/apple-icon.png",
  "/admin/sw.js",
];

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

  // 임시 비밀번호를 받은 직원은 비밀번호를 바꾸기 전에는 다른 화면으로 못 간다(32차).
  //
  // 🔴 화주포털이 셸(CustomerPortalShell)에서 하는 일을 admin 에서는 여기가 한다 —
  //    admin 에는 포털 셸에 해당하는 것이 이 미들웨어다.
  // 🔴 role·status 와 같은 방식으로 user_metadata 를 본다. DB 를 매 이동마다 조회하면
  //    페이지 전환이 그만큼 느려지는데, 이 값을 켜는 곳은 재발급 API 한 곳뿐이고
  //    그 API 가 비밀번호를 바꾸는 **같은 호출**에서 메타데이터도 함께 켠다.
  //    그래서 `=== true` 일 때만 막고, 값이 없으면 막지 않는 것이 맞다.
  // 🔴 `/admin/change-password` 를 PUBLIC_PATHS 에 넣지 말 것 — 로그인이 필요한
  //    화면이다. 여기서 예외로 빼는 것으로 충분하다.
  if (
    user.user_metadata?.must_change_password === true &&
    !pathname.startsWith("/admin/change-password")
  ) {
    return NextResponse.redirect(new URL("/admin/change-password", req.url));
  }

  // 직원 계정 관리 · 지원접속 이력 · 운영 대시보드(로드맵⑥, 담당자별 영업성과 등
  // 민감정보 포함) 화면은 관리자만 접근 가능
  if (
    (pathname.startsWith("/admin/staff") ||
      pathname.startsWith("/admin/support-logs") ||
      pathname.startsWith("/admin/sms-logs") ||
      pathname.startsWith("/admin/dashboard")) &&
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
