// service_role 서버 클라이언트 — 유일 정의처. PR #103 리뷰에서 신설.
//
// ══ 🔴 왜 필요한가 — `force-dynamic` 만으로는 부족하다 ═══════════════════════
//
// 원칙 21번이 "관리자용 GET 라우트에는 `export const dynamic = 'force-dynamic'`
// 을 붙일 것" 이라고 했는데, **그것만으로는 캐시가 다 꺼지지 않는다.**
//
// `force-dynamic` 은 **라우트 렌더링**을 동적으로 만들 뿐이고, 라우트 핸들러 **안에서
// supabase-js 가 부르는 개별 `fetch` 호출**은 Next 의 Data Cache 에 그대로 걸린다.
// 그러면 DB 를 아무리 바꿔도 API 는 **옛 응답을 계속 내려준다.**
//
// 🔴 **프로덕션 빌드(`next start`)에서 실제로 재현했다**(2026-08-27):
//     DB 4종 → API 4종 (정상)
//     DB 를 20종으로 바꾼 뒤 **서버 재시작 없이** 호출 → API 는 여전히 **4종**
//     세 번을 연달아 불러도 4종. `force-dynamic` 이 붙어 있는데도 그렇다.
//
//   ⚠️ 처음에 개발 서버에서 같은 증상을 보고 **"dev 서버 캐시"로 넘겼다가**, 사용자가
//     운영에서 "차량 종류가 늘지 않았다"고 신고해서 다시 팠다. **개발 서버만의 일이
//     아니다.** 증상이 "코드는 맞는데 값이 안 바뀐다" 라서 원인을 엉뚱한 데서 찾기 쉽다.
//
// ══ 🔴 새 GET 라우트는 예외 없이 이 함수를 쓸 것 ═══════════════════════════
//
//   ① `export const dynamic = "force-dynamic"`  (라우트 렌더링)
//   ② `createServiceClient(url, serviceKey)`    (그 안의 fetch)
//
//   둘 다 있어야 한다. 하나만으로는 막히지 않는다.
//
// ⚠️ POST 라우트는 애초에 캐시 대상이 아니라 위험이 없다. 이번에는 GET 라우트 11개만
//    바꿨다 — 나머지 46개까지 한꺼번에 건드리면 리뷰가 감당되지 않는다. POST 를 옮길
//    이유가 생기면 그때 옮기면 되고, 옮겨도 무해하다.

import { createClient } from "@supabase/supabase-js";

export function createServiceClient(url: string, serviceKey: string) {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      // 🔴 이 한 줄이 핵심이다. 지우면 GET 라우트가 옛 값을 계속 내려준다.
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
