// 상차/하차 방법 표준 8개 옵션 — 실제 화물정보망(24시콜/화물인/배차킹) 표현 기준.
// 견적/오더/발주요청/공개견적문의 등 상하차 방법을 다루는 모든 화면이 이 목록을
// 공유한다 — 화면마다 따로 옵션을 정의하지 말 것 (운임기준표의 "상하차방식"
// 가산기준도 이 라벨과 동일한 option_name으로 관리됨)
export const LOADING_METHODS = [
  { label: "기본운송", desc: "차량 적재함에서 상하차, 별도 장비/인력 불필요" },
  { label: "지게차", desc: "파렛트 화물, 지게차로 상하차" },
  // 🔴 `도크`는 20차에 추가됐다. `rate_surcharges`에 같은 이름의 행이 반드시 있어야 한다
  // (`migrations/2026-08-26_surcharge_dock.sql`) — 견적 계산이 문자열 완전일치로 매칭해서
  // 행이 없으면 **예외도 경고도 없이 가산만 빠진다.** 옵션을 더 늘릴 때도 같이 넣을 것.
  { label: "도크", desc: "물류센터 도크에 차량 접안, 별도 장비 불필요" },
  { label: "수작업", desc: "인력으로 상하차" },
  { label: "호이스트", desc: "차량 자체 장착 소형 크레인, 기사님 단독 처리" },
  { label: "크레인", desc: "별도 크레인 장비 필요" },
  { label: "컨베이어", desc: "컨베이어 벨트 이용" },
  { label: "협의필요", desc: "위에 해당 없는 특수 상황" },
] as const;

export const LOADING_METHOD_OPTIONS: string[] = LOADING_METHODS.map((m) => m.label);
