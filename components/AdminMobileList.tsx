"use client";

import { ReactNode } from "react";

// 관리자 목록 화면의 **모바일 카드** 공용 부품 (34차 실사용 리뷰 3라운드).
//
// 사용자 지적: *"모바일에서 견적관리, 운송오더, 배차관리, 정산관리의 레이아웃이 엉망이다.
// 보기 좋게 구성하자. 생략가능한 부분은 생략해도 된다."*
//
// 실측(390px)이 그대로였다 — 표가 각각 **880 / 610 / 914 / 1056px** 이라 358px 칸에
// 들어가지 않았고, 셋은 **페이지 자체가 옆으로 밀려서**(scrollWidth 627·931·1073) 제목·
// 필터까지 잘려 나갔다.
//
// 🔴 **원칙 13번 그대로다** — 데스크탑 `<table>` 과 모바일 카드는 **완전히 별개 JSX** 다.
//    표를 CSS 로 카드처럼 접는 방법(`display:block` + `td::before`)을 쓰지 않은 이유는,
//    그러면 **모든 `<td>` 에 `data-label` 을 달아야 하고** 「생략 가능한 부분은 생략」이
//    안 되기 때문이다(열을 지우려면 데스크탑에서도 지워진다).
// 🔴 **칸을 줄인 것이지 정보를 버린 것이 아니다** — 각 화면에서 무엇을 뺐는지는 그
//    화면의 주석에 적어 두었다. 뺀 값은 행을 눌러 상세로 들어가면 전부 보인다.
// 🟢 스타일은 화주포털이 쓰던 `.mobile-row-*` 를 그대로 재사용한다 —
//    `globals.css` 에 이미 있어서 **CSS 를 한 줄도 안 더했다.**

export type AdminMobileRow = {
  key: string;
  /** 카드를 누르면 갈 곳. 데스크탑 표의 `<tr onClick>` 과 같아야 한다. */
  onClick?: () => void;
  /** 왼쪽 위 — 그 행의 이름(견적번호·오더번호 등) */
  title: ReactNode;
  /** 제목 아래 배지 줄 — 정기계약·혼적가능처럼 표에서 번호 밑에 붙던 것들 */
  tags?: ReactNode;
  /**
   * 오른쪽 위 — 상태 드롭다운·버튼.
   * 🔴 **여기 넣은 것은 눌러도 카드 이동이 일어나지 않는다**(`stopPropagation`).
   *    표에서 `<td onClick={(e) => e.stopPropagation()}>` 로 감싸던 것과 같은 처리다 —
   *    빼면 상태를 바꾸려고 누른 순간 상세로 튄다.
   */
  action?: ReactNode;
  /** 라벨 : 값 줄. 값이 `null` 인 줄은 그리지 않는다(빈 줄이 남지 않게). */
  lines: { label: string; value: ReactNode }[];
};

export default function AdminMobileList({
  rows,
  empty,
}: {
  rows: AdminMobileRow[];
  empty?: string;
}) {
  if (rows.length === 0) {
    return <div className="empty-state">{empty || "표시할 항목이 없습니다."}</div>;
  }
  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.key}
          className="mobile-row-card"
          onClick={r.onClick}
          style={{ cursor: r.onClick ? "pointer" : undefined }}
        >
          <div className="mobile-row-top">
            {/* 🔴 `minWidth: 0` 을 빼지 말 것 — flex 칸의 기본 최소폭이 내용 크기라
                긴 번호·배지가 오른쪽 액션을 화면 밖으로 밀어낸다. */}
            <div style={{ minWidth: 0 }}>
              <span className="num" style={{ fontWeight: 700, fontSize: 13.5 }}>
                {r.title}
              </span>
              {r.tags && (
                <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {r.tags}
                </div>
              )}
            </div>
            {r.action && (
              <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                {r.action}
              </div>
            )}
          </div>
          {r.lines
            .filter((l) => l.value !== null && l.value !== undefined)
            .map((l, i) => (
              <div className="mobile-row-line" key={i}>
                <span className="mobile-row-label">{l.label}</span>
                {/* 🔴 값은 오른쪽 정렬 + `minWidth: 0` — 주소처럼 긴 값이 라벨을 밀지 않게 */}
                <span style={{ textAlign: "right", minWidth: 0, wordBreak: "keep-all" }}>
                  {l.value}
                </span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
