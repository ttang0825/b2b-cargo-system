"use client";

import { ListPaginationResult } from "@/lib/useListPagination";

/**
 * 목록 하단의 **페이지 번호** 줄. `useListPagination()` 이 돌려준 것을 그대로 넘긴다.
 *
 * 🔴 **무한 스크롤로 바꾸지 말 것**(지시서 하지 말 것 3번) — 담당자가 「몇 페이지에 있던
 *    그 화주」로 되돌아가야 하는 업무라 번호가 있어야 한다.
 * 🔴 **번호 버튼은 최대 5개만 그린다** — 화주가 늘수록 페이지가 느는데, 다 그리면 번호가
 *    줄바꿈으로 쌓여 모바일에서 화면을 먹는다. 양 끝(1·마지막)은 항상 두고 사이는 `…` 다.
 *    ⚠️ 한 페이지 15건이라 539건이면 **36페이지**인데, 그래도 버튼은 9개 그대로다.
 * 🟢 총 건수는 **필터가 걸린 뒤의 수**다 — `/admin/customers` 제목의 `(총 N건)` 은
 *    필터 전 전체라서 서로 다른 값이고, 그게 정상이다(중복 표기가 아니다).
 */
export default function ListPagination({
  pagination,
  unit = "건",
  compact = false,
}: {
  pagination: ListPaginationResult<unknown>;
  /** 세는 단위. 화주는 "건" */
  unit?: string;
  /**
   * 🔴 그 화면의 표가 `.table-compact`(칸 여백 8px)면 켤 것 — 안 켜면 건수 글자가
   *    첫 칸보다 8px 오른쪽에서 시작한다. 기본 표(16px)는 끄고 쓴다.
   */
  compact?: boolean;
}) {
  const { page, totalPages, total, rangeStart, rangeEnd, setPage } = pagination;

  // 목록이 비어 있으면 화면이 이미 "없습니다"를 그리고 있다 — 여기서 또 말하지 않는다.
  if (total === 0) return null;

  const numbers = pageNumbers(page, totalPages);

  return (
    <div className={compact ? "list-pagination list-pagination-compact" : "list-pagination"}>
      <div className="list-pagination-count">
        {total.toLocaleString("ko-KR")}
        {unit} 중 <strong>{rangeStart.toLocaleString("ko-KR")}</strong>–
        <strong>{rangeEnd.toLocaleString("ko-KR")}</strong>
      </div>

      {/* 🔴 한 페이지뿐이면 번호를 그리지 않는다 — 누를 곳이 없는 버튼만 남는다.
          위의 건수 줄은 그대로 두어 "몇 건인지"는 항상 보이게 한다. */}
      {totalPages > 1 && (
        <nav className="list-pagination-nav" aria-label="페이지 이동">
          <button
            type="button"
            className="list-pagination-btn"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            이전
          </button>
          {numbers.map((n, i) =>
            n === null ? (
              // 🔴 `…` 는 가운뎃점 3개가 아니라 줄임표다 — 버튼이 아니라서 누를 수 없다.
              <span key={`gap-${i}`} className="list-pagination-gap">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                className={
                  n === page
                    ? "list-pagination-btn list-pagination-btn-on"
                    : "list-pagination-btn"
                }
                aria-current={n === page ? "page" : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            )
          )}
          <button
            type="button"
            className="list-pagination-btn"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            다음
          </button>
        </nav>
      )}
    </div>
  );
}

/**
 * 그릴 번호 목록. `null` 은 `…` 자리다.
 * 🔴 항상 **1과 마지막**을 넣는다 — 「맨 끝으로」 버튼을 따로 두지 않는 이유다.
 */
function pageNumbers(page: number, totalPages: number): (number | null)[] {
  const WINDOW = 5;
  if (totalPages <= WINDOW + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(WINDOW / 2);
  let from = Math.max(2, page - half);
  let to = Math.min(totalPages - 1, page + half);

  // 양 끝에 붙었을 때도 창 크기를 유지한다(한쪽만 짧아지면 번호가 들쭉날쭉해 보인다).
  if (page - half < 2) to = Math.min(totalPages - 1, from + WINDOW - 1);
  if (page + half > totalPages - 1) from = Math.max(2, to - WINDOW + 1);

  const out: (number | null)[] = [1];
  if (from > 2) out.push(null);
  for (let n = from; n <= to; n++) out.push(n);
  if (to < totalPages - 1) out.push(null);
  out.push(totalPages);
  return out;
}
