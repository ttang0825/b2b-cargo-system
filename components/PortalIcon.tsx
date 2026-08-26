// 화주 운송관리 포털 메뉴 아이콘 — 24차 (시안 v4에서 추출)
//
// 🔴 **`public/`에 파일로 두고 `<img>`로 부르면 안 된다.** 선택 상태에서 색이 바뀌어야
// 하는데(사이드바 = 검정 배경 위 흰색 / 모바일 탭바 = 흰 배경 위 검정) `<img>`는 CSS로
// 색을 못 바꾼다. 그래서 인라인 SVG 컴포넌트이고, 색은 전부 `currentColor`라 부모의
// `color`를 그대로 따라간다.
//
// 🔴 **지키지 않으면 깨지는 것 셋** (아이콘 번들 README §2)
//   1. `fillRule="evenodd"` 를 빼지 말 것 — 채움 아이콘의 내부 디테일(홈의 문, 발주의 +,
//      견적의 체크)은 덮어씌운 흰 도형이 아니라 **형태에 뚫린 구멍**이다. 빼면 검정 배경에서
//      구멍이 메워져 실루엣만 남는다.
//   2. **트럭만 `nonzero` 이고 path 가 2개**다. 두 번째 path(바퀴 허브·창문·차체 틈)를
//      지우면 바퀴가 뭉갠다.
//   3. 트럭 채움의 짐칸–캡 사이 틈(1×9.2)은 어두운 배경에서 획이 두꺼워 보이는 것을
//      보정하는 장치다. 지우지 말 것.
//
// ⚠️ **원본 4개(invoices·stats·locations·profile)의 채움 버전은 실제로는 채움이 아니라
// `stroke="#FFFFFF"` 로 하드코딩된 흰 획이었다.** 그대로 쓰면 흰 배경인 **모바일 탭바에서
// 보이지 않는다.** 번들 README 는 "전부 currentColor 로 치환돼 있다"고 적었으나 이 넷이
// 빠져 있어 24차에서 `currentColor` 로 바꿨다 — 사이드바(흰색)와 탭바(검정) 양쪽에서
// 의도대로 보인다. **다시 `#FFFFFF` 로 되돌리지 말 것.**
//
// 크기: 데스크톱 사이드바 21px · 모바일 하단 탭바 26px. viewBox 는 전부 `0 0 24 24`.

export type PortalIconName =
  | "home"
  | "request"
  | "quotes"
  | "dispatch"
  | "invoices"
  | "stats"
  | "locations"
  | "profile"
  | "menu";

type PathSpec = {
  d: string;
  fillRule?: "evenodd" | "nonzero";
  strokeWidth?: number;
  fill?: string;
  stroke?: string;
  strokeLinejoin?: "miter" | "round";
};
type IconSpec = { fill: string; stroke: string; strokeWidth?: number; paths: PathSpec[] };

const ICONS: Record<PortalIconName, { line: IconSpec; fill: IconSpec }> = {
  home: {
    line: { fill: "none", stroke: "currentColor", strokeWidth: 1.4, paths: [
      { d: "M3.6 10.7 10.7 4.3a2 2 0 0 1 2.6 0l7.1 6.4V19a2 2 0 0 1-2 2h-3.6v-4.6a2.8 2.8 0 0 0-5.6 0V21H5.6a2 2 0 0 1-2-2z", fillRule: "evenodd" },
    ] },
    fill: { fill: "currentColor", stroke: "none", strokeWidth: 1.5, paths: [
      { d: "M3.6 10.7 10.7 4.3a2 2 0 0 1 2.6 0l7.1 6.4V19a2 2 0 0 1-2 2h-3.6v-4.6a2.8 2.8 0 0 0-5.6 0V21H5.6a2 2 0 0 1-2-2z", fillRule: "evenodd" },
    ] },
  },
  request: {
    line: { fill: "none", stroke: "currentColor", strokeWidth: 1.4, paths: [
      { d: "M4.6 6a2.4 2.4 0 0 1 2.4-2.4h6.6l5.8 5.4V18a2.4 2.4 0 0 1-2.4 2.4H7A2.4 2.4 0 0 1 4.6 18zM13.4 3.8v5.2h5.4M12 12.4v4.4M9.4 14.6h5.2", fillRule: "evenodd" },
    ] },
    fill: { fill: "currentColor", stroke: "none", strokeWidth: 1.5, paths: [
      { d: "M4.6 6a2.4 2.4 0 0 1 2.4-2.4h6.4l5.8 5.4V18a2.4 2.4 0 0 1-2.4 2.4H7A2.4 2.4 0 0 1 4.6 18zM11.2 11.2h1.6v2.4h2.4v1.6h-2.4v2.4h-1.6v-2.4H8.8v-1.6h2.4z", fillRule: "evenodd" },
    ] },
  },
  quotes: {
    line: { fill: "none", stroke: "currentColor", strokeWidth: 1.4, paths: [
      { d: "M4.6 6a2.4 2.4 0 0 1 2.4-2.4h6.6l5.8 5.4V18a2.4 2.4 0 0 1-2.4 2.4H7A2.4 2.4 0 0 1 4.6 18zM13.4 3.8v5.2h5.4M9.2 14.8l2.2 2.2 4-4.2", fillRule: "evenodd" },
    ] },
    fill: { fill: "currentColor", stroke: "none", strokeWidth: 1.5, paths: [
      { d: "M4.6 6a2.4 2.4 0 0 1 2.4-2.4h6.4l5.8 5.4V18a2.4 2.4 0 0 1-2.4 2.4H7A2.4 2.4 0 0 1 4.6 18zM15.35 12.55l-1.05-1.05-2.85 2.9-1.4-1.4-1.05 1.05 2.45 2.45z", fillRule: "evenodd" },
    ] },
  },
  dispatch: {
    line: { fill: "none", stroke: "currentColor", strokeWidth: 1.4, paths: [
      { d: "M13.2 17.4V6.6a1.8 1.8 0 0 0-1.8-1.8H4.6a1.8 1.8 0 0 0-1.8 1.8v10.8M2.8 17.4h1.9M9.3 17.4h5M18.9 17.4h1.9M13.2 8.2h3.8a1.8 1.8 0 0 1 1.4.6l2 2.6a1.8 1.8 0 0 1 .4 1.1v4.9M9.3 17.4a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 1 1 4.6 0M18.9 17.4a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 1 1 4.6 0", fillRule: "nonzero" },
    ] },
    fill: { fill: "currentColor", stroke: "none", strokeWidth: 1.5, paths: [
      { d: "M2.1 6.4a1.8 1.8 0 0 1 1.8-1.8h7.5a1.8 1.8 0 0 1 1.8 1.8v11.7H3.9a1.8 1.8 0 0 1-1.8-1.8zM13.2 7.5h4.1c.6 0 1.1.2 1.4.7l2.2 2.8c.3.3.4.7.4 1.1v6h-8.1zM4 17.4a3 3 0 1 1 6 0 3 3 0 0 1-6 0M13.6 17.4a3 3 0 1 1 6 0 3 3 0 0 1-6 0", fillRule: "nonzero" },
      { d: "M8 17.4a1 1 0 1 1-2 0 1 1 0 1 1 2 0M17.6 17.4a1 1 0 1 1-2 0 1 1 0 1 1 2 0M14.6 9.1h2.7l1.9 2.7h-4.6zM12.7 8.2h1v9.2h-1z", fill: "currentColor", stroke: "none", strokeLinejoin: "miter" },
    ] },
  },
  invoices: {
    line: { fill: "none", stroke: "currentColor", strokeWidth: 1.4, paths: [
      { d: "M2.8 8.4a2.4 2.4 0 0 1 2.4-2.4h13.6a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4H5.2a2.4 2.4 0 0 1-2.4-2.4zM2.8 10.2h18.4M6.4 14.4h3.6", fillRule: "evenodd" },
    ] },
    fill: { fill: "none", stroke: "currentColor", strokeWidth: 1.5, paths: [
      { d: "M2.8 8.4a2.4 2.4 0 0 1 2.4-2.4h13.6a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4H5.2a2.4 2.4 0 0 1-2.4-2.4zM2.8 10.2h18.4M6.4 14.4h3.6", fillRule: "evenodd" },
    ] },
  },
  stats: {
    line: { fill: "none", stroke: "currentColor", strokeWidth: 1.4, paths: [
      { d: "M4 20h16", fillRule: "evenodd" },
      { d: "M7 20v-5.6M12 20V6.8M17 20v-8.4", strokeWidth: 2.2 },
    ] },
    fill: { fill: "none", stroke: "currentColor", strokeWidth: 1.5, paths: [
      { d: "M4 20h16", fillRule: "evenodd" },
      { d: "M7 20v-5.6M12 20V6.8M17 20v-8.4", strokeWidth: 2.2 },
    ] },
  },
  locations: {
    line: { fill: "none", stroke: "currentColor", strokeWidth: 1.4, paths: [
      { d: "M18 10.2c0 4.2-4.6 8.6-5.7 9.6a.45.45 0 0 1-.6 0C10.6 18.8 6 14.4 6 10.2a6 6 0 0 1 12 0zM10.2 9.4a1.2 1.2 0 0 1 1.2-1.2h1.2a1.2 1.2 0 0 1 1.2 1.2v2.4a1.2 1.2 0 0 1-1.2 1.2h-1.2a1.2 1.2 0 0 1-1.2-1.2z", fillRule: "evenodd" },
    ] },
    fill: { fill: "none", stroke: "currentColor", strokeWidth: 1.5, paths: [
      { d: "M18 10.2c0 4.2-4.6 8.6-5.7 9.6a.45.45 0 0 1-.6 0C10.6 18.8 6 14.4 6 10.2a6 6 0 0 1 12 0zM10.2 9.4a1.2 1.2 0 0 1 1.2-1.2h1.2a1.2 1.2 0 0 1 1.2 1.2v2.4a1.2 1.2 0 0 1-1.2 1.2h-1.2a1.2 1.2 0 0 1-1.2-1.2z", fillRule: "evenodd" },
    ] },
  },
  profile: {
    line: { fill: "none", stroke: "currentColor", strokeWidth: 1.4, paths: [
      { d: "M15.4 8.6a3.4 3.4 0 1 1-6.8 0 3.4 3.4 0 1 1 6.8 0M5.6 20.2a6.4 6.4 0 0 1 12.8 0", fillRule: "evenodd" },
    ] },
    fill: { fill: "none", stroke: "currentColor", strokeWidth: 1.5, paths: [
      { d: "M15.4 8.6a3.4 3.4 0 1 1-6.8 0 3.4 3.4 0 1 1 6.8 0M5.6 20.2a6.4 6.4 0 0 1 12.8 0", fillRule: "evenodd" },
    ] },
  },
  menu: {
    line: { fill: "none", stroke: "currentColor", strokeWidth: 1.4, paths: [
      { d: "M4 7.6h16M4 12h16M4 16.4h16", fillRule: "nonzero" },
    ] },
    fill: { fill: "currentColor", stroke: "none", paths: [
      { d: "M4 6.9h16v1.6H4zM4 11.2h16v1.6H4zM4 15.5h16v1.6H4z", fillRule: "nonzero" },
    ] },
  },
};

export default function PortalIcon({
  name,
  selected = false,
  size = 21,
}: {
  name: PortalIconName;
  selected?: boolean;
  size?: number;
}) {
  const spec = selected ? ICONS[name].fill : ICONS[name].line;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={spec.fill}
      stroke={spec.stroke}
      strokeWidth={spec.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {spec.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fillRule={p.fillRule}
          strokeWidth={p.strokeWidth}
          fill={p.fill}
          stroke={p.stroke}
          strokeLinejoin={p.strokeLinejoin}
        />
      ))}
    </svg>
  );
}
