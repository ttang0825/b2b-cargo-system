"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";

declare global {
  interface Window {
    daum: any;
  }
}

type DaumPostcodeData = {
  roadAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
};

// 다음(Daum) 우편번호 스크립트를 페이지당 한 번만 로드하는 공용 훅.
// 여러 화면에서 각자 <script> 태그를 붙이던 방식을 하나로 통합.
//
// 🔴 **주소 칸에서 엔터로 바로 검색하는 규칙도 여기 있다**(39차 D장) — 사용자 지시
//    *"주소칸에 바로 동이나 길을 입력하고 검색(enter)하면 바로 적용되게 … 우리 시스템에서
//    주소적는 곳은 모두 같은 방식으로 적용되어야 한다"*.
//    주소 부품이 **둘**이라(`components/AddressSearch.tsx` · `components/pv2/Pv2AddressField.tsx`
//    — 25차가 인라인 style 때문에 갈랐다) 규칙을 부품마다 적으면 반드시 한쪽이 낡는다.
//    🔴 **엔터 처리를 화면이나 부품에 다시 적지 말고 `enterToSearch` 를 쓸 것.**
export function useDaumPostcode() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  /**
   * 우편번호 팝업을 연다.
   *
   * @param q 검색어. 주면 **그 결과를 이미 보여주는 상태로** 열린다.
   *
   * 🔴 **옵션 이름은 `q` 다** — `daum.Postcode` 인스턴스의 `open({ q })` 이고 생성자
   *    옵션이 아니다. 공식 문서(`postcode.map.daum.net/guide`)는 이 환경의 프록시가
   *    막아 못 봤고, **`react-daum-postcode@4.0.0` 의 타입·구현으로 확인했다**
   *    (`OpenOptions { q?, left?, top?, popupTitle?, popupKey?, autoClose? }` ·
   *    구현이 `.open({q: defaultQuery, …})` 로 넘긴다). ⚠️ **1차 출처가 아니다.**
   * 🔴 **빈 검색어를 넘기지 않는다** — 넘기면 「결과 없음」 화면으로 열릴 수 있다.
   *    검색어가 없으면 예전처럼 **그냥 빈 팝업**을 연다(기존 「눌러서 열기」 경로).
   */
  const open = useCallback((oncomplete: (data: DaumPostcodeData) => void, q?: string) => {
    if (!window.daum) return;
    const postcode = new window.daum.Postcode({ oncomplete });
    const keyword = (q || "").trim();
    if (keyword) postcode.open({ q: keyword });
    else postcode.open();
  }, []);

  /**
   * 주소 칸의 `onKeyDown` 에 그대로 붙이는 핸들러를 만든다.
   *
   * ```tsx
   * <input value={value} onKeyDown={enterToSearch(value, handleSearch)} />
   * ```
   *
   * 🔴 **`preventDefault()` 를 `ready` 보다 먼저, 조건 없이 부른다.** 주소 칸을 쓰는
   *    화면 여덟이 `<form>` 안이라 엔터가 곧 **제출**이고, `/quote`·`/apply` 는
   *    anon INSERT 경로라 **주소를 치다가 문의가 그대로 접수된다.** 스크립트가 아직
   *    안 떴을 때도 막아야 하므로 `ready` 검사 앞에 둔다.
   *    ⚠️ 폼 쪽 `handleFormKeyDown`(원칙 34번)이 이미 막고 있지만 **그것에 기대지
   *    않는다** — 그 핸들러가 없는 화면이 셋이고(`/admin/orders/[id]` ·
   *    `/customer/locations` · `CompanyFieldInput`) 앞으로 더 생길 수 있다.
   * 🔴 **친 글자는 「검색어」이지만 지우지 않는다** — 이 프로젝트의 주소 칸은 원래부터
   *    **직접 입력을 허용**하고(그때는 `sido`/`sigungu` 가 빈 값으로 간다) 그것이 두
   *    부품 주석과 원칙 37번이 못박은 동작이다. **고르지 않고 닫았을 때 되돌리는 장치를
   *    넣지 말 것** — 넣으면 직접 입력 기능이 사라진다.
   */
  const enterToSearch = useCallback(
    (value: string, search: (q?: string) => void) =>
      (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (!ready) return;
        search(value.trim() || undefined);
      },
    [ready]
  );

  return { ready, open, enterToSearch };
}
