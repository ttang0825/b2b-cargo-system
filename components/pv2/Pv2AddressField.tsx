"use client";

import { pickSelectedAddress, useDaumPostcode } from "@/lib/useDaumPostcode";

/**
 * 화주포털 v2 전용 주소 입력 — 도로명주소 + 주소검색 버튼 + 상세주소.
 *
 * 🔴 **`components/AddressSearch.tsx` 를 고치는 대신 이 래퍼를 새로 만들었다**(25차).
 *    이유: 그 공용 컴포넌트는 포털 밖 **6개 파일**(`/quote`·`/apply`·`/admin/quotes`·
 *    `/admin/orders`·`/admin/orders/[id]`·`/admin/companies/[id]`)이 같이 쓰는데,
 *    주소검색 버튼과 상세주소 입력에 **인라인 style** 이 박혀 있어 CSS 로 덮을 수 없다
 *    (`padding:0 10px` · `borderRadius:6` · `fontSize:12` · `marginTop:6`).
 *    `!important` 로 억지로 덮거나 원본을 고치면 그 6개 화면이 같이 바뀐다.
 *
 * 🟢 **공유하는 것은 `useDaumPostcode` 훅 하나뿐**이고 그 훅은 스크립트 로딩만 한다 —
 *    마크업·스타일에 영향이 없어 안전하다. 훅도 고치지 않았다.
 *
 * ⚠️ 직접 타이핑하면 sido/sigungu 를 알 수 없어 빈 값으로 넘긴다(원본과 같은 동작).
 *    검색으로 채우면 상세주소를 초기화하는 것도 원본과 같다.
 */
export default function Pv2AddressField({
  value,
  detailValue,
  onChange,
  onDetailChange,
  placeholder = "도로명주소 검색 또는 직접 입력",
  detailPlaceholder = "상세주소 (동/층/호수, 창고 위치 등)",
  inputClassName = "pv2-input",
}: {
  value: string;
  detailValue: string;
  onChange: (address: string, sido: string, sigungu: string) => void;
  onDetailChange: (detail: string) => void;
  placeholder?: string;
  detailPlaceholder?: string;
  inputClassName?: string;
}) {
  const { ready, open, enterToSearch } = useDaumPostcode();

  // 🔴 `q` 를 주면 팝업이 **그 검색 결과를 이미 보여준 상태로** 열린다(39차 D장).
  //    규칙과 엔터 처리는 `lib/useDaumPostcode.ts` 하나이고 공개·관리자 부품
  //    (`components/AddressSearch.tsx`)도 같은 훅을 쓴다 — 여기에 다시 적지 말 것.
  function handleSearch(q?: string) {
    open((data) => {
      // 🔴 **사용자가 고른 타입 그대로** 넣는다(`pickSelectedAddress`) — 원본
      //    `AddressSearch` 와 **같은 함수**를 쓴다. 🔴 여기에 규칙을 다시 적지 말 것.
      onDetailChange("");
      onChange(pickSelectedAddress(data), data.sido || "", data.sigungu || "");
    }, q);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        {/* 🔴 엔터로 바로 검색한다(39차 D장) — 규칙은 `lib/useDaumPostcode.ts` 하나다.
            `enterToSearch` 가 **폼 제출을 먼저 막는다**(`/customer/request` 가 `<form>` 안). */}
        <input
          className={inputClassName}
          value={value}
          onChange={(e) => onChange(e.target.value, "", "")}
          onKeyDown={enterToSearch(value, handleSearch)}
          placeholder={placeholder}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        <button type="button" className="pv2-addr-btn" onClick={() => handleSearch()} disabled={!ready}>
          주소검색
        </button>
      </div>
      <input
        className={inputClassName}
        value={detailValue}
        onChange={(e) => onDetailChange(e.target.value)}
        placeholder={detailPlaceholder}
      />
    </>
  );
}
