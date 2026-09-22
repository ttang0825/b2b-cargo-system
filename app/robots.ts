import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

// robots.txt는 "크롤 차단"일 뿐 이미 색인된 결과의 삭제를 보장하지 않음 — 실제
// 색인 차단의 핵심은 각 세그먼트 layout.tsx의 `robots: { index: false }` metadata이고
// 이 파일은 보조 방어선임(둘 다 유지할 것). 정적 public/robots.txt 대신 이 메타데이터
// 파일 컨벤션을 쓰는 이유는 나머지 메타데이터도 전부 코드(layout.tsx)로 관리하고 있어서임.
// 🔴 `sitemap` 필드는 **절대 URL**이어야 한다 — 주소는 `lib/siteUrl.ts` 한 곳뿐이다.
//    목록 자체는 `app/sitemap.ts` 가 실제 라우트에서 뽑는다(손으로 적지 말 것).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // 이메일무단수집거부 경로는 5차에서 `/email-policy`로 확정함
      // ⚠️ `/about`·`/vehicles` 는 2026-09-08 에 화면째 삭제해서 여기서도 뺐다
      //    (사용자 확정 — "나중에 필요하면 새로 다시 만들면 된다").
      //    되살릴 때는 이 목록에 다시 넣을 것.
      allow: ["/", "/quote", "/apply", "/guide", "/terms", "/privacy", "/email-policy"],
      // 🔴 `/q` 는 **견적서 공유 링크**다(2026-09-15) — 특정 화주의 상호·구간·금액이
      //    담기므로 절대 색인되면 안 된다. 핵심 방어선은 `app/q/layout.tsx` 의
      //    `robots: { index: false }` 이고 여기는 보조다(**둘 다 유지할 것**).
      // 🔴 `/reward-event` 는 **선택된 고객사만** 참여하는 프로모션 안내다
      //    (2026-09-22) — 검색으로 누구나 닿으면 선택되지 않은 사람에게 **사실이
      //    아닌 광고**가 된다(표시광고법 제3조). 핵심 방어선은
      //    `app/reward-event/layout.tsx` 의 `robots: { index: false }` 이고 여기는
      //    보조다(**둘 다 유지할 것**). 🚨 `app/sitemap.ts` 의 `NOINDEX` 도 한 벌이다.
      disallow: ["/admin", "/customer", "/q", "/reward-event"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
