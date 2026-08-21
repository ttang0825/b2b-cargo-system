"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 공개 진입 화면(`/customer/login`·`/apply`) 폼 하단의 "← 홈으로" 링크.
//
// ⚠️ 헤더 로고와 역할이 겹쳐 보이지만 **동작이 다르다**: 헤더 로고는 홈 맨 위로 가는
// 평범한 이동이고, 이 링크는 **왔던 자리로 되돌아간다.** 랜딩 ⑥ 운송관리 섹션은 페이지
// 한참 아래에 있어서, 로그인하러 왔다가 마음을 바꿔 홈으로 돌아가면 맨 위로 튕겨
// 스크롤을 다시 내려야 했다(13차 PR #88 리뷰).
//
// 🔴 구현 방식: `href="/"`를 그대로 두고 **평클릭만 가로채** `router.back()`을 부른다.
//    - 브라우저 뒤로가기는 이전 문서의 **스크롤 위치까지 복원**한다(실측 확인). 위치를
//      직접 계산하거나 sessionStorage에 저장하는 방식보다 정확하고, 저장값이 낡을 일도 없다.
//    - 랜딩에서 왔는지는 **`?from=landing` 쿼리 파라미터**로 판정한다. 랜딩이 이 두
//      화면으로 보내는 링크에만 붙는다(`app/page.tsx` ⑥ 버튼 2개 + `LandingHeader`가
//      **랜딩일 때만** 붙임). 그 표시가 없으면 평범한 링크로 `/`(맨 위)로 간다.
//    - ⚠️ **`document.referrer`로 판정하면 안 된다** — 랜딩에서 넘어오는 경로가
//      `next/link` 클라이언트 전환이라 referrer가 갱신되지 않고 빈 값으로 남는다.
//      실제로 그렇게 만들었다가 복원이 전혀 동작하지 않는 것을 실측으로 발견했다.
//    - ⚠️ `useSearchParams()`가 아니라 `window.location.search`를 쓴다 — 원칙 38번의
//      Suspense 경계 요구를 건드리지 않기 위함이다(효과 안에서만 읽으므로 서버 렌더와
//      어긋나지 않는다).
//    - `history.length <= 1`이면 가로채지 않는다 — 새 탭으로 열린 경우 뒤로 갈 곳이 없다.
//    - Ctrl/Cmd/Shift/가운데 버튼은 가로채지 않는다 — 새 탭 열기·주소 복사가 그대로
//      동작해야 한다(31차 법적 문서 모달에서 쓴 것과 같은 기준).
export default function BackToHomeLink() {
  const router = useRouter();
  // 랜딩에서 넘어온 경우인지. 서버 렌더 결과와 어긋나지 않도록 마운트 후에만 판정한다.
  const [cameFromLanding, setCameFromLanding] = useState(false);

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    setCameFromLanding(from === "landing" && window.history.length > 1);
  }, []);

  return (
    <div style={{ marginTop: 28, textAlign: "center" }}>
      <Link
        href="/"
        className="back-to-home-link"
        onClick={(e) => {
          if (!cameFromLanding) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          router.back();
        }}
      >
        <span aria-hidden="true">←</span> 홈으로
      </Link>
    </div>
  );
}
