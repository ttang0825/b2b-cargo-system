import { COMPANY_INFO_NAME_PARTS } from "@/lib/companyInfo";

/**
 * 견적서 발행업체 상호 표기 — `법인명 │ 브랜드명`.
 *
 * 🔴 슬래시 글자(`/`) 대신 **세로 구분선**으로 그린다(사용자 확정 2026-08-26).
 *    `COMPANY_INFO.name` 평문을 그대로 렌더링하면 슬래시가 글자로 찍힌다 —
 *    화면·인쇄에 그릴 때는 반드시 이 컴포넌트를 쓸 것.
 *
 * 🔴 구분선을 `background` 로 그리지 말 것 — 이 컴포넌트가 쓰이는 곳은 **인쇄(PDF)**
 *    화면이고, 브라우저는 인쇄 시 배경색을 기본으로 지운다(`print-color-adjust`).
 *    `borderLeft` 는 배경이 아니라 테두리라 그대로 인쇄된다. 그래서 폭 0 + 왼쪽
 *    테두리 1px 로 만들었다.
 *
 * 🔴 두 이름은 **같은 서체·같은 크기**다 — 어느 한쪽도 강조하지 않는다.
 *    크기·굵기는 감싸는 쪽에서 정하고 여기서는 상속만 받는다.
 */
export default function CompanyNameMark() {
  const [legal, brand] = COMPANY_INFO_NAME_PARTS;
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      {legal}
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 0,
          height: "0.92em",
          borderLeft: "1px solid #c4c4c4",
          margin: "0 9px",
          verticalAlign: "-0.14em",
        }}
      />
      {brand}
    </span>
  );
}
