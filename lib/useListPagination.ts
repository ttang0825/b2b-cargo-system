"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * 목록형 화면의 **페이지 나누기** 공용 훅 (원칙 43번 `useListSearchSort` 와 같은 결).
 *
 * 🔴 **이 훅은 「이미 걸러지고 정렬된 배열」을 받아서 자를 뿐이고, 조회를 나누지 않는다.**
 *    왜 서버에서 안 나누는지가 이 파일의 핵심이니 지우지 말 것 —
 *
 *    화주 목록의 정렬 키 6개 중 **셋이 DB 컬럼이 아니라 JS 계산값**이다.
 *      지역  `formatRegion()`  = metro_region + district → metro_region → district → region
 *      업종  `formatIndustry()` = 같은 3단 폴백
 *      상태  `STATUS_OPTIONS.indexOf(status)` ← 배열 순서지 가나다순이 아니다
 *    PostgREST 의 `.order()` 는 **컬럼 이름만** 받으므로 이 셋을 서버에서 정렬하려면
 *    생성 컬럼이나 뷰를 새로 만들어야 한다(= DB 변경). 검색도 `formatRegion(c).includes(q)`
 *    라 `ilike` 하나로 옮기면 **결과가 달라진다.**
 *    🔴 그래서 「정렬 기준을 바꾸지 말 것」을 지키는 길은 클라이언트 나누기뿐이다.
 *
 * 🟢 **그래도 느림은 사라진다** — 실측(2026-09-11)에서 화주는 **539건**이고 조회 응답은
 *    수십 KB 수준인데, 느린 것은 그 **539행을 DOM 에 그리는 것**이었다(행마다 상태
 *    드롭다운 + 배지 + 버튼이 들어간다). 그리는 수를 15로 줄이면 그 비용이 사라진다.
 *
 * 🔴 **로딩 스피너를 만들지 말 것** — 페이지를 넘길 때 네트워크 요청이 없어서 기다림이
 *    아예 없다. 스피너를 넣으면 있지도 않은 지연을 연출하는 셈이다(지시서 2-2 가 막으려던
 *    「빈 화면 깜빡임」은 이 구조에서는 애초에 생기지 않는다).
 */

/**
 * 🔴 페이지당 건수를 바꾸려면 **여기 한 곳**만 고칠 것 — 두 화면이 같이 쓴다.
 *
 * ⚠️ 처음에 50으로 올렸다가 실사용 리뷰에서 **15로 내렸다**(PR #144 —
 *    *"한페이지에 50행은 너무 많다. 15개 업체만 한페이지에 보이게 하자."*).
 *    화주 539건 기준 **36페이지**가 되므로, 이 값을 다시 만질 때는 번호 줄이
 *    모바일에서 넘치지 않는지 같이 볼 것(`ListPagination` 이 창을 5개로
 *    묶어두어 페이지 수가 늘어도 버튼 개수는 그대로다).
 */
export const LIST_PAGE_SIZE = 15;

export type ListPaginationResult<T> = {
  /** 실제로 그릴 것 — 화면은 반드시 이것을 `.map()` 해야 한다 */
  pageItems: T[];
  page: number;
  totalPages: number;
  /** 필터·검색이 걸린 **뒤**의 건수다(완료조건 3 — 필터를 바꾸면 이 수도 바뀐다) */
  total: number;
  /** "N건 중 **a**–b" 의 a. 총 0건이면 0 */
  rangeStart: number;
  /** "N건 중 a–**b**" 의 b */
  rangeEnd: number;
  setPage: (p: number) => void;
};

export function useListPagination<T>(
  /** 🔴 걸러지고 정렬까지 끝난 배열을 넘길 것 */
  items: T[],
  /**
   * 🔴 **필터·검색·정렬을 나타내는 문자열.** 이 값이 바뀌면 페이지가 1로 돌아간다
   *    (완료조건 3). 안 넘기면 「3페이지를 보다가 필터를 바꿨더니 결과가 2건인데
   *    3페이지라 빈 화면」이 된다.
   */
  resetKey: string,
  pageSize: number = LIST_PAGE_SIZE
): ListPaginationResult<T> {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 필터·검색·정렬이 바뀌면 1페이지로.
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  // 🔴 목록이 줄어들어 지금 페이지가 사라지는 경우를 잡는다(예: 마지막 페이지의
  //    유일한 화주를 CRM 으로 보내 목록에서 빠질 때). 이 가드가 없으면 빈 화면이 남는다.
  const safePage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    pageItems,
    page: safePage,
    totalPages,
    total,
    rangeStart: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    rangeEnd: Math.min(safePage * pageSize, total),
    setPage,
  };
}
