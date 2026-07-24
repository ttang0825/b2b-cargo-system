import { createBrowserClient } from "@supabase/ssr";

// 관리자 로그인/로그아웃 전용 클라이언트. 세션을 쿠키에 저장해서 middleware.ts(서버 측)가
// 같은 세션을 읽을 수 있게 함 — lib/supabaseClient.ts(anon, localStorage 기반, 관리자
// 데이터 조회/수정용)와는 용도가 다르므로 섞어 쓰지 않는다.
export const supabaseAdminAuth = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
