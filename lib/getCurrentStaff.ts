import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버 컴포넌트/API 라우트에서 "지금 로그인한 직원이 누구인지, role이 뭔지" 확인할 때 재사용.
// staff_accounts에는 "본인 행만 조회 가능" RLS 정책이 있어서 anon key + 로그인 쿠키만으로 충분함.
export async function getCurrentStaff() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // API 라우트 응답에서는 세션 쿠키를 다시 쓸 필요가 없음 (미들웨어가 이미 갱신 처리)
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabase
    .from("staff_accounts")
    .select("id,name,email,role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff || staff.status !== "active") return null;
  return staff as { id: string; name: string; email: string; role: "admin" | "staff"; status: string };
}
