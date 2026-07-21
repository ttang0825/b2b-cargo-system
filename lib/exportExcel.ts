import * as XLSX from "xlsx";

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

// 시트 하나짜리 파일
export function exportRowsToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, any>[]
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  autoFitColumns(worksheet, rows);
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
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });
  XLSX.writeFile(workbook, filename);
}
