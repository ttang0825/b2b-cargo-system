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

// ── 문서형 시트(견적서 등) ───────────────────────────────────────────────────
//
// 위 `exportRowsToExcel`은 "같은 모양의 행이 여러 개"인 목록용이라 견적서처럼
// 항목-값이 세로로 나열되는 문서에는 맞지 않아 따로 만들었다.
//
// ⚠️ **금액은 반드시 숫자로 넣는다.** `"150,000원"` 같은 문자열로 넣으면 받는 쪽에서
// 합계(SUM)가 계산되지 않는다 — 화주가 엑셀을 원하는 이유가 내부 품의·비교·복사라서
// 계산이 되는 것이 핵심이다. 천단위 구분은 값이 아니라 **셀 서식(`z`)**으로 준다.
// 날짜도 같은 이유로 날짜 타입으로 넣어 정렬·필터가 되게 한다.
// **나중에 서식을 손대더라도 문자열로 되돌리지 말 것.**
export type DocRow =
  /** 문서 제목(맨 위 한 줄) */
  | { kind: "title"; text: string }
  /** 구획 제목 */
  | { kind: "section"; text: string }
  | { kind: "blank" }
  | { kind: "text"; label: string; value: string }
  | { kind: "money"; label: string; value: number }
  | { kind: "number"; label: string; value: number; unit?: string }
  | { kind: "date"; label: string; value: Date; withTime?: boolean }
  /** 라벨 없이 한 줄 전체를 쓰는 안내 문구 */
  | { kind: "note"; text: string };

const MONEY_FORMAT = '#,##0"원"';
const DATE_FORMAT = "yyyy-mm-dd";
const DATETIME_FORMAT = "yyyy-mm-dd hh:mm";

export function exportDocumentToExcel(filename: string, sheetName: string, rows: DocRow[]) {
  // A열=항목, B열=내용. 병합을 쓰지 않아 복사·필터가 깨지지 않는다
  const aoa: (string | number | Date | null)[][] = rows.map((r) => {
    switch (r.kind) {
      case "title":
      case "section":
      case "note":
        return [r.text, null];
      case "blank":
        return [null, null];
      case "number":
        return [r.label + (r.unit ? ` (${r.unit})` : ""), r.value];
      default:
        return [r.label, r.value];
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });

  rows.forEach((r, i) => {
    const labelRef = XLSX.utils.encode_cell({ r: i, c: 0 });
    const valueRef = XLSX.utils.encode_cell({ r: i, c: 1 });

    if (r.kind === "title" && ws[labelRef]) {
      ws[labelRef].s = { font: { bold: true, sz: 16, color: { rgb: "1A1A1A" } } };
    }
    if (r.kind === "section" && ws[labelRef]) {
      ws[labelRef].s = {
        font: { bold: true, color: { rgb: "1A1A1A" } },
        fill: { fgColor: { rgb: "FFF3C4" } }, // 목록 내보내기와 같은 브랜드 톤
      };
    }
    if (r.kind === "note" && ws[labelRef]) {
      ws[labelRef].s = { font: { sz: 9, color: { rgb: "777777" } }, alignment: { wrapText: true } };
    }
    if (r.kind === "text" || r.kind === "money" || r.kind === "number" || r.kind === "date") {
      if (ws[labelRef]) ws[labelRef].s = { font: { bold: true, color: { rgb: "555555" } } };
    }
    // 금액·날짜는 값 자체를 숫자/날짜로 두고 서식만 입힌다
    if (r.kind === "money" && ws[valueRef]) {
      ws[valueRef].t = "n";
      ws[valueRef].z = MONEY_FORMAT;
      ws[valueRef].s = { numFmt: MONEY_FORMAT, alignment: { horizontal: "right" } };
    }
    if (r.kind === "date" && ws[valueRef]) {
      const fmt = r.withTime ? DATETIME_FORMAT : DATE_FORMAT;
      ws[valueRef].z = fmt;
      ws[valueRef].s = { numFmt: fmt };
    }
  });

  // A열은 라벨, B열은 값. 값이 길 수 있어 넉넉히
  ws["!cols"] = [{ wch: 24 }, { wch: 52 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
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
