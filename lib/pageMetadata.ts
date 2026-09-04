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
 *
 * 🔴 **description 은 80자 이내여야 한다** — 네이버 서치어드바이저 「간단체크」가
 *    넘으면 경고를 낸다(2026-09-04 실측: 랜딩이 104자라 「사이트 설명」·「Open Graph
 *    설명」 두 항목에 ⚠️ 가 떴다. 나머지 6개 항목은 전부 ✅ 였고 이것만 걸렸다).
 *    🔴 **`buildPageMetadata` 가 같은 문자열을 둘 다에 넣으므로 한쪽만 고칠 수 없다** —
 *    반대로 여기서 한 번 줄이면 두 경고가 함께 사라진다.
 *    ⚠️ 넘어도 빌드는 통과한다(네이버 권고이지 오류가 아니다). 대신 아래 검사가
 *    빌드 로그에 경고를 남긴다 — `next.config.mjs` 의 자리표시자 경고와 같은 방식이다.
 */

/** 네이버 서치어드바이저 「간단체크」가 권고하는 사이트 설명 길이 상한. */
export const DESCRIPTION_MAX_LENGTH = 80;
export function buildPageMetadata(params: {
  title: string;
  description: string;
  /** 슬래시로 시작하는 경로. 랜딩은 `"/"`. */
  path: string;
}): Metadata {
  const { title, description, path } = params;

  // 🔴 길이를 넘으면 빌드 로그에 남긴다. 빌드를 실패시키지는 않는다 —
  //    네이버 권고를 못 지킨 것이지 화면이 깨지는 것이 아니기 때문이다.
  //    `[...description].length` 인 것은 이모지·결합 문자를 한 글자로 세기 위해서다.
  const descLength = [...description].length;
  if (descLength > DESCRIPTION_MAX_LENGTH) {
    console.warn(
      `[metadata] ${path} description 이 ${descLength}자로 ` +
        `${DESCRIPTION_MAX_LENGTH}자를 넘습니다. 네이버 서치어드바이저 「간단체크」가 ` +
        `「사이트 설명」·「Open Graph 설명」 두 항목에 경고를 냅니다.`
    );
  }

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
