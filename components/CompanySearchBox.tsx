"use client";

import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 화주 업체 검색 입력 + 결과 목록 — **키보드로 고를 수 있는** 공용 부품
// (2026-09-22 · 사용자 요청 *"화주업체 검색을 하면 … 드롭다운으로 목록이 뜨는데,
//  이를 키보드 「아래」버튼으로도 선택할 수 있으면 좋겠다. 마우스로 다시 클릭하려니
//  불편하다"*).
//
// 🔴 **왜 부품으로 뺐나** — 같은 입력창·같은 목록이 **견적관리와 운송오더 두 곳에
//    복사돼 있었다.** 키보드 조작을 한쪽에만 붙이면 담당자는 화면마다 다르게 동작하는
//    검색창을 쓰게 된다(원칙 43번 `useListSearchSort` 와 같은 결).
//    🔴 **세 번째 화면이 생기면 여기를 쓸 것** — 화면에 다시 적지 말 것.
//
// 🔴 **고른 뒤에 무엇을 할지는 화면이 정한다**(`onSelect`) — 견적은 청구주기·출발지를
//    채우고 펼침을 열며, 오더는 지난 오더를 불러온다. **그 로직을 여기로 옮기지 말 것.**
//
// 🔴 **접근성을 직접 넣었으니 지우지 말 것**(`role="listbox"`·`aria-activedescendant`·
//    ↑↓·Enter·Esc·Home·End) — 이것은 네이티브 `select` 가 아니라 `div` 목록이라
//    브라우저가 키보드 조작을 주지 않는다(원칙 57번이 포털에서 겪은 것과 같은 자리).
//
// ⚠️ **원칙 57번의 대상이 아니다** — 그 원칙은 화주포털에서 네이티브 `select`·`date` 를
//    쓰지 말라는 것이고, 여기는 **처음부터 네이티브가 없던 자리**(검색 결과 목록)다.
// ─────────────────────────────────────────────────────────────────────────────

export type CompanySearchItem = {
  id: string;
  name: string;
  address?: string | null;
};

export default function CompanySearchBox<T extends CompanySearchItem>({
  label = "화주 업체 검색",
  placeholder = "회사명 입력",
  query,
  onQueryChange,
  results,
  selected,
  onSelect,
  showAddress = false,
  wrapClassName = "field",
  children,
}: {
  label?: string;
  placeholder?: string;
  /** 입력창 글자 — 화주를 고르면 화면이 `selected.name` 을 보여준다 */
  query: string;
  onQueryChange: (v: string) => void;
  results: T[];
  selected: T | null;
  onSelect: (c: T) => void;
  /** 견적관리는 주소를 함께 보여준다(같은 이름의 업체를 가리려고) */
  showAddress?: boolean;
  wrapClassName?: string;
  /** 입력칸 아래 안내(오더의 「지난 오더에서 불러왔습니다」 등) */
  children?: React.ReactNode;
}) {
  /**
   * 지금 짚고 있는 줄. 🔴 **−1 은 「아무것도 안 짚음」이다** — 0 으로 두면 목록이
   * 뜨자마자 첫 줄이 강조돼서, 글자를 더 치려던 담당자가 **Enter 로 엉뚱한 업체를
   * 고른다.** 아래키를 한 번 눌러야 비로소 0이 된다.
   */
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 🔴 결과가 바뀌면 짚은 자리를 **되돌린다** — 안 되돌리면 글자를 더 쳐서 목록이
  //    줄었을 때 **사라진 줄을 짚은 채로** 남아 Enter 가 엉뚱하게 동작한다.
  useEffect(() => {
    setActive(-1);
  }, [results]);

  const open = !selected && results.length > 0;

  // 🔴 짚은 줄이 화면 밖이면 스크롤한다 — 목록이 `maxHeight: 160` 이라 네댓 줄만
  //    보이고, 아래키로 내려가면 곧바로 안 보이는 자리로 들어간다.
  useEffect(() => {
    if (!open || active < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(results.length - 1);
    } else if (e.key === "Enter") {
      // 🔴 **짚은 줄이 있을 때만 가로챈다.** 아무것도 안 짚었으면 그냥 넘긴다 —
      //    이 입력창은 폼 안에 있고, 폼의 Enter 는 `handleFormKeyDown`(원칙 34번)이
      //    막는다. 여기서 무턱대고 `preventDefault` 를 하면 그 규칙이 가려진다.
      if (active >= 0 && results[active]) {
        e.preventDefault();
        onSelect(results[active]);
        setActive(-1);
      }
    } else if (e.key === "Escape") {
      // 🔴 목록만 닫는다 — 입력한 글자는 지우지 않는다(다시 치게 만들지 않는다).
      e.preventDefault();
      setActive(-1);
      onQueryChange("");
    }
  }

  const listId = "company-search-list";

  return (
    <div style={{ marginBottom: 14 }}>
      <div className={wrapClassName}>
        <label>{label}</label>
        <input
          value={selected ? selected.name : query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          // 🔴 브라우저 자체 자동완성 목록이 이 드롭다운 위에 겹친다(원칙 17번과 같은 증상)
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        />
        {children}
        {/* 🔴 **조작법을 적는다** — 키보드로 되는지 알 길이 없으면 아무도 안 쓴다.
            목록이 떠 있을 때만 그려서 평소에는 잡음이 되지 않게 한다. */}
        {open && (
          <p className="company-search-hint">↑ ↓ 로 고르고 Enter 로 선택 · Esc 로 닫기</p>
        )}
      </div>
      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="card company-search-list"
        >
          {results.map((c, i) => (
            <div
              key={c.id}
              id={`${listId}-${i}`}
              data-idx={i}
              role="option"
              aria-selected={i === active}
              className={`company-search-row${i === active ? " is-active" : ""}`}
              // 🔴 `onMouseDown` 이 아니라 `onClick` 그대로다 — 옛 동작을 바꾸지 않는다.
              onClick={() => onSelect(c)}
              // 마우스를 얹으면 그 줄을 짚는다(키보드와 마우스가 서로 다른 줄을
              // 강조하고 있으면 Enter 가 어디로 갈지 알 수 없다)
              onMouseEnter={() => setActive(i)}
            >
              {c.name}
              {showAddress && c.address && (
                <span className="company-search-sub">{c.address}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
