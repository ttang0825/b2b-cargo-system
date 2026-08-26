import { createBrowserClient } from "@supabase/ssr";

// 관리자 로그인/로그아웃 전용 클라이언트. 세션을 쿠키에 저장해서 middleware.ts(서버 측)가
// 같은 세션을 읽을 수 있게 한다.
//
// ⚠️ 19차부터 lib/supabaseClient.ts(관리자 데이터 조회/수정용)도 createBrowserClient 라
//   같은 쿠키 세션을 쓴다. 브라우저에서 createBrowserClient 는 모듈 싱글턴이므로 둘은
//   **같은 인스턴스**다. 예전 주석의 "anon·localStorage 라 섞어 쓰지 말 것"은 그때
//   이야기이고, 지금은 갈라져 있지 않다. 로그인/로그아웃은 여전히 이 이름으로만 부른다
//   — 이름이 곧 용도 표시라 데이터 조회 코드에서 auth 를 만지지 않게 막아준다.
export const supabaseAdminAuth = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
