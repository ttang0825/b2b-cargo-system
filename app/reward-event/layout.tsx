// 적립 이벤트 안내(공개 화면) — 2026-09-22 신설.
//
// 🚨 **색인하지 않는다 — 의도다.** 리워드는 `reward_memberships` 를 담당자가 켠
//    **선택된 고객사만** 참여하는 프로모션이다. 검색으로 누구나 닿는 자리에 「5% 적립」을
//    걸면 **선택되지 않은 사람에게는 사실이 아닌 광고**가 된다(표시광고법 제3조 ·
//    HANDOFF §5-3). 이 화면의 독자는 **문자로 링크를 받은 고객사**다.
//
//    🔴 **막는 곳이 셋이다 — 하나만 두지 말 것**(원칙 25번의 이중체크와 같은 결):
//        ① 이 파일의 `robots: { index: false, follow: false }`   ← 핵심 방어선
//        ② `app/robots.ts` 의 `disallow`                          ← 보조
//        ③ `app/sitemap.ts` 의 `NOINDEX`                          ← 🚨 아래 참고
//
//    🚨 **③ 을 빠뜨리기 쉽다.** `app/sitemap.ts` 는 목록을 손으로 적지 않고 **`app/`
//       아래 실제 라우트를 훑어서** 뽑는다. `/q/[token]` 은 **동적 세그먼트라 저절로
//       빠지지만** 이 화면은 정적 경로라 **가만히 두면 사이트맵에 실린다** —
//       그러면 「사이트맵은 실어 놓고 페이지는 색인 거부」라는 **서로 싸우는 신호**가
//       검색엔진에 간다. 그래서 그 파일에 제외 목록을 만들었다.
//
//    🟢 **색인을 켜기로 하면** 위 셋을 되돌리고 `app/robots.ts` 의 `allow` 에 넣으면
//       된다 — 다만 그때는 **본문에 「선정된 고객사 한정」이 남아 있는지 먼저 확인할 것**
//       (`lib/rewardEventContent.ts` 의 `REWARD_EVENT_SCOPE_NOTE`).
import { buildPageMetadata } from "@/lib/pageMetadata";

// 🔴 설명은 80자 이내여야 한다(`DESCRIPTION_MAX_LENGTH`) — 넘으면 빌드 로그에 경고가 남는다.
export const metadata = {
  ...buildPageMetadata({
    title: "적립 이벤트 안내 | 위캐리 운송",
    description:
      "위캐리 운송 적립 이벤트 안내입니다. 적립·사용 방법과 기간을 안내합니다.",
    path: "/reward-event",
  }),
  robots: { index: false, follow: false },
};

export default function RewardEventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
