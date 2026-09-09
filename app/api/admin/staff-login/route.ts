import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import {
  LoginAttemptTracker,
  LOGIN_FAILED_MESSAGE,
  LOGIN_LOCKED_MESSAGE,
  resolveStaffLogin,
  type StaffLoginRecord,
} from "@/lib/staffLogin";

// 🔴 `force-dynamic` 과 `createServiceClient()` 가 **둘 다** 필요하다(원칙 21번).
//    force-dynamic 은 라우트 렌더링만 동적으로 만들 뿐이고, supabase-js 가 내부적으로
//    쓰는 fetch 는 그대로 Next 의 Data Cache 를 탄다. 로그인에서 이게 걸리면
//    **방금 아이디를 바꾼 직원이 옛 아이디로만 들어와진다.**
export const dynamic = "force-dynamic";

// 프로세스 메모리에 사는 과속방지턱. 한계는 lib/staffLogin.ts 주석 참고.
const tracker = new LoginAttemptTracker();

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  let loginId = "";
  let password = "";
  try {
    const body = await req.json();
    loginId = typeof body?.login_id === "string" ? body.login_id : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    // 본문이 깨져 있어도 「형식이 잘못됐다」고 알려주지 않는다 — 아래 공통 실패로 떨어진다.
  }

  // 🔴 로그인 성공 시 세션 쿠키를 응답에 실어야 한다. createServerClient 의 setAll 이
  //    쓰는 쿠키를 그대로 모아 두었다가 응답에 옮긴다(브라우저의 createBrowserClient 가
  //    같은 이름의 쿠키를 읽으므로 화면 쪽은 손댈 것이 없다).
  const cookieStore = cookies();
  const pending: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const auth = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          pending.push({ name, value, options: (options || {}) as Record<string, unknown> })
        );
      },
    },
  });

  const admin = createServiceClient(url, serviceKey);

  const result = await resolveStaffLogin(
    {
      // 🔴 service_role 로 찾는다. staff_accounts 는 로그인 **전**이라 세션이 없고,
      //    anon 은 정책상 한 행도 못 읽는다(2026-09-09 실측 0행).
      //    ⚠️ `ilike` 를 쓰는 이유 — supabase-js 에는 `lower(col) = ?` 를 거는 방법이
      //    없고, 인자 없는 `ilike` 는 대소문자만 무시하는 완전일치다. `_`·`%` 가
      //    들어오면 와일드카드가 되지만, resolveStaffLogin 이 그 앞에서
      //    LOGIN_ID_PATTERN(영문 소문자+숫자)으로 이미 걸러낸 뒤에만 부른다.
      async findStaffByLoginId(id): Promise<StaffLoginRecord | null> {
        const { data } = await admin
          .from("staff_accounts")
          .select("email,status,must_change_password")
          .ilike("login_id", id)
          .maybeSingle();
        return (data as StaffLoginRecord) || null;
      },
      async signIn(email, pw) {
        const { error } = await auth.auth.signInWithPassword({ email, password: pw });
        return !error;
      },
    },
    { loginId, password },
    tracker
  );

  if (result.kind !== "ok") {
    // 🔴 없는 아이디 · 퇴사 · 비밀번호 틀림 — **셋의 응답이 완전히 같다**(완료조건 7번).
    //    문구도 상태코드도 나누지 말 것. 🔴 실패한 아이디·이메일을 console 에 찍지도
    //    말 것 — 로그가 곧 유출 경로다(완료조건 6번).
    return NextResponse.json(
      { error: result.kind === "locked" ? LOGIN_LOCKED_MESSAGE : LOGIN_FAILED_MESSAGE },
      { status: 401 }
    );
  }

  // 🔴 응답에 이메일을 담지 않는다 — 아이디를 넣어보며 직원 이메일을 수집할 수 있다.
  const res = NextResponse.json({ ok: true, must_change_password: result.mustChangePassword });
  pending.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}
