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
      allow: ["/", "/about", "/vehicles", "/quote", "/apply", "/terms", "/privacy", "/email-policy"],
      disallow: ["/admin", "/customer"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
