// 화주 출처(수도권 중소업체 / 프랜차이즈 / 패키징공장 / 직접등록)를 색상으로 구분하기 위한 유틸.
// 임포트된 DB(source_sheet)든, 직접등록(manual_source_type)이든 이 파일 하나로 색상을 통일 관리합니다.

// 엑셀 임포트 당시 저장된 원본 시트명 → 화면에 보여줄 라벨
export const SHEET_LABELS: Record<string, string> = {
  수도권중소업체DB: "수도권 중소업체",
  프랜차이즈DB: "프랜차이즈",
  패키징공장DB: "패키징공장",
};

// 직접등록 시 선택 가능한 출처 분류 옵션
export const MANUAL_SOURCE_OPTIONS = ["수도권 중소업체", "프랜차이즈", "패키징공장", "기타"];

type ColorPair = { bg: string; text: string };

const CATEGORY_COLORS: Record<string, ColorPair> = {
  "수도권 중소업체": { bg: "#e8f3ff", text: "#3182f6" }, // 블루
  "프랜차이즈": { bg: "#fff1e2", text: "#d9730d" }, // 오렌지
  "패키징공장": { bg: "#e6f7ec", text: "#1b9c57" }, // 그린
  "직접등록": { bg: "#f3eeff", text: "#7c4dff" }, // 퍼플
  "기타": { bg: "#f1f2f4", text: "#6b7280" }, // 그레이
};

export function getSourceColor(label: string): ColorPair {
  return CATEGORY_COLORS[label] || { bg: "var(--accent-soft)", text: "var(--accent)" };
}

export type SourceChip = { label: string } & ColorPair;

// 화주 1건을 받아서, 목록/상세 어디서나 그대로 렌더링할 수 있는 칩 배열을 반환
// - 임포트된 업체: 칩 1개 (예: "수도권 중소업체")
// - 직접등록 업체: 칩 2개 ("직접등록" + 선택한 분류, 기타면 수기 설명 포함)
export function getSourceChips(company: {
  source_sheet?: string | null;
  manual_source_type?: string | null;
  manual_source_note?: string | null;
}): SourceChip[] {
  if (company.source_sheet) {
    const label = SHEET_LABELS[company.source_sheet] || company.source_sheet;
    return [{ label, ...getSourceColor(label) }];
  }

  const chips: SourceChip[] = [{ label: "직접등록", ...getSourceColor("직접등록") }];

  if (company.manual_source_type === "기타") {
    chips.push({
      label: company.manual_source_note
        ? `기타: ${company.manual_source_note}`
        : "기타",
      ...getSourceColor("기타"),
    });
  } else if (company.manual_source_type) {
    chips.push({
      label: company.manual_source_type,
      ...getSourceColor(company.manual_source_type),
    });
  }

  return chips;
}
