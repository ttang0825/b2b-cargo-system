import type { Metadata } from "next";
import {
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  SITE_URL,
} from "./siteUrl";

/**
 * 공개 화면 metadata 를 만드는 **유일한 경로**다.
 *
 * 🔴 **`og:title`·`og:description` 을 `<title>`·`description` 과 따로 적지 말 것.**
 *    이 함수가 같은 값을 양쪽에 넣는다 — 두 벌이 되면 조용히 갈린다(59차
 *    `lib/arrivalType.ts` 와 같은 판단). 화면은 제목·설명·경로 셋만 넘긴다.
 *
 * 🔴 **금지 표현 기준이 그대로 적용된다** — OG description 도 검색결과·카카오톡에
 *    그대로 노출되는 문장이다. 12·13차가 메타를 두 번 연속 놓쳤고 30차에 또 걸렸다.
 *
 * ⚠️ `canonical` 은 상대경로로 넘긴다 — 루트 layout 의 `metadataBase` 가 절대화한다.
 */
export function buildPageMetadata(params: {
  title: string;
  description: string;
  /** 슬래시로 시작하는 경로. 랜딩은 `"/"`. */
  path: string;
}): Metadata {
  const { title, description, path } = params;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "위캐리 운송",
      locale: "ko_KR",
      url: `${SITE_URL}${path === "/" ? "" : path}`,
      title,
      description,
      images: [
        {
          url: OG_IMAGE_URL,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_URL],
    },
  };
}
