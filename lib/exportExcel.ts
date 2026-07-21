import * as XLSX from "xlsx-js-style";

export type ExportPeriod = "week" | "month" | "year" | "all";

// 선택한 기간의 시작 시점(ISO 문자열)을 계산. "전체"면 null 반환(제한 없음)
export function getExportPeriodFrom(period: ExportPeriod): string | null {
  if (period === "all") return null;
  const from = new Date();
  if (period === "week") {
    from.setDate(from.getDate() - from.getDay()); // 이번 주 일요일
  } else if (period === "month") {
    from.setDate(1);
  } else if (period === "year") {
    from.setMonth(0, 1);
  }
  from.setHours(0, 0, 0, 0);
  return from.toISOString();
}

// 화주포털 엑셀 파일명 규칙: "화주명_위캐리_운송정산내역_날짜.xlsx"
export function buildExportFilename(companyName: string, label: string, dateLabel: string) {
  const namePart = companyName ? sanitizeFilename(companyName) + "_" : "";
  return `${namePart}위캐리_${label}_${dateLabel}.xlsx`;
}

// 파일명에 못 쓰는 특수문자 제거
export function sanitizeFilename(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "").trim();
}

// 한글(전각 문자)은 영문보다 넓게 보이므로 2배로 계산해서 더 정확한 너비를 구함
function displayWidth(s: string) {
  let width = 0;
  for (const ch of s) {
    width += /[\u3131-\uD79D\uAC00-\uD7A3]/.test(ch) ? 2 : 1;
  }
  return width;
}

function autoFitColumns(worksheet: XLSX.WorkSheet, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  worksheet["!cols"] = headers.map((key) => {
    const maxLen = Math.max(
      displayWidth(key),
      ...rows.map((r) => displayWidth(String(r[key] ?? "")))
    );
    return { wch: Math.min(Math.max(maxLen + 2, 8), 45) };
  });
}

// 1행(헤더)에 은은한 배경색 + 굵은 글씨 적용, 1행 틀고정
function styleHeaderAndFreeze(worksheet: XLSX.WorkSheet, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  headers.forEach((_, col) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellRef]) return;
    worksheet[cellRef].s = {
      font: { bold: true, color: { rgb: "1A1A1A" } },
      fill: { fgColor: { rgb: "FFF3C4" } }, // 브랜드 톤에 맞춘 은은한 옐로우
      alignment: { vertical: "center" },
    };
  });
  // 1행 고정 (스크롤해도 헤더가 계속 보임)
  (worksheet as any)["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };
}

// 시트 하나짜리 파일
export function exportRowsToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, any>[]
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  autoFitColumns(worksheet, rows);
  styleHeaderAndFreeze(worksheet, rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

// 여러 시트를 한 파일에 담기 (운송내역 + 정산내역 통합용)
export function exportMultiSheetExcel(
  filename: string,
  sheets: { name: string; rows: Record<string, any>[] }[]
) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    autoFitColumns(worksheet, rows);
    styleHeaderAndFreeze(worksheet, rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });
  XLSX.writeFile(workbook, filename);
}
