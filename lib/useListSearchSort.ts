"use client";

import { useMemo, useState } from "react";

// 목록형 화면(포털)에서 검색+정렬을 공용으로 처리하는 훅. 페이지네이션은
// 다루지 않음(admin도 아직 없는 별도 로드맵 항목) — 이미 불러온 배열
// 전체를 프론트에서 검색·정렬만 한다. 화면마다 로컬로 각자 구현하지 않고
// 이 훅 하나를 재사용할 것(원칙: PasswordInput/AddressSearch/exportExcel과
// 같은 공용화 패턴). 나중에 admin 목록 화면에도 그대로 옮겨 쓸 수 있도록
// 화면 종속적인 부분(필드명 등) 없이 범용으로 설계함.
export type SortDirection = "asc" | "desc";

export function useListSearchSort<T>(
  items: T[],
  searchFields: (item: T) => (string | number | null | undefined)[],
  sorters: Record<string, (item: T) => string | number | null | undefined>,
  defaultSortKey: string,
  defaultSortDir: SortDirection = "desc"
) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir);

  // 헤더 클릭용: 같은 컬럼을 다시 클릭하면 방향만 토글, 다른 컬럼이면 그
  // 컬럼으로 바꾸고 오름차순부터 시작
  function toggleSort(key: string) {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir("asc");
      return key;
    });
  }

  const result = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter((item) =>
          searchFields(item).some(
            (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)
          )
        )
      : items;

    const sorter = sorters[sortKey];
    if (!sorter) return filtered;

    const sorted = [...filtered].sort((a, b) => {
      const av = sorter(a);
      const bv = sorter(b);
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), "ko");
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, sortKey, sortDir]);

  return { search, setSearch, sortKey, setSortKey, sortDir, setSortDir, toggleSort, result };
}

// 정렬 컬럼 헤더에 붙이는 화살표 표시 (▲/▼/없음)
export function sortIndicator(currentKey: string, key: string, dir: SortDirection) {
  if (currentKey !== key) return "";
  return dir === "asc" ? " ▲" : " ▼";
}
