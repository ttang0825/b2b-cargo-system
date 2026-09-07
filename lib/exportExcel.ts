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

/**
 * 엑셀의 `wch` 는 대략 **반각 문자 수**라, 한글·한자·전각·이모지를 한 글자로 세면
 * 칸이 좁아 글자가 잘린다. East Asian Width 의 Wide/Fullwidth 구간을 2로 센다.
 * 🔴 **한 칸으로 되돌리지 말 것.**
 */
function isWideChar(cp: number) {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // 한글 자모
    (cp >= 0x2e80 && cp <= 0xa4cf) || // CJK 부수·한자·가나·한글 호환자모
    (cp >= 0xac00 && cp <= 0xd7a3) || // 한글 음절
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK 호환 한자
    (cp >= 0xfe30 && cp <= 0xfe6f) || // CJK 세로쓰기 형태
    (cp >= 0xff00 && cp <= 0xff60) || // 전각 영숫자·기호
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) || // 이모지
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK 확장
  );
}

function displayWidth(s: string) {
  let width = 0;
  for (const ch of s) {
    width += isWideChar(ch.codePointAt(0) ?? 0) ? 2 : 1;
  }
  return width;
}

/** 머리글이 그 너비 안에서 차지하는 줄 수(줄바꿈된 뒤). 상한 3줄. */
const HEADER_MAX_LINES = 3;
/** 한 줄 높이(pt). 글자를 10pt 로 낮춰도 여유를 두려고 넉넉히 잡는다. */
const HEADER_LINE_HEIGHT = 15;
/**
 * 🔴 머리글이 이 줄 수 안에 들어갈 만큼은 **하한으로 보장한다**.
 *
 * 머리글을 너비 계산에서 완전히 빼 봤더니, 데이터가 짧은 금액 열이 하한 8칸까지
 * 좁아져 **접힌 머리글이 그 안에서 다시 잘려 보였다**(실사용 지적 2026-09-07).
 * 엑셀의 줄바꿈은 공백을 우선 끊어서 계산보다 줄이 더 늘기도 한다.
 * 그래서 「머리글이 너비를 끈다」와 「머리글이 안 보인다」 사이를 이 값으로 가른다.
 * 🔴 2를 1로 내리면 머리글이 다시 너비를 끌어 칸이 넓어진다.
 */
const HEADER_WRAP_LINES = 2;
/**
 * 시트 전체 글자 크기(pt). 엑셀 기본 11pt 보다 낮춰 **같은 칸에 더 많은 글자**가
 * 들어가게 한다(실사용 지적 2026-09-07). 열 너비 단위(`wch`)는 통합문서 기본 폰트
 * 기준이라 이 값을 낮춰도 바뀌지 않으므로, 위 폭 계산이 그만큼 보수적이 되어 안전하다.
 */
const BODY_FONT_SIZE = 10;

/**
 * 열 너비 — 🔴 **머리글이 아니라 데이터 기준**이다.
 *
 * 머리글을 계산에 넣으면 「청구금액 합계(부가세 별도)」처럼 긴 제목 하나 때문에
 * 그 열이 쓸데없이 넓어지고, 화면을 옆으로 한참 밀어야 나머지가 보인다.
 * 머리글은 대신 **줄바꿈으로 접는다**(`styleHeaderAndFreeze`).
 *
 * 🔴 상한 40 — 「특이사항」처럼 긴 자유 입력이 있으면 칸 하나가 화면을 통째로 먹는다.
 * 🔴 하한 8 — 그보다 좁으면 머리글이 세 줄로도 안 접혀 오히려 나빠진다.
 */
const COL_WIDTH_MIN = 8;
const COL_WIDTH_MAX = 40;

function autoFitColumns(worksheet: XLSX.WorkSheet, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const widths = headers.map((key) => {
    // 🔴 너비를 **끄는** 것은 데이터뿐이다 — `displayWidth(key)` 를 그대로 넣지 말 것.
    //    머리글은 하한으로만 관여한다(HEADER_WRAP_LINES 주석 참고).
    const maxLen = Math.max(0, ...rows.map((r) => displayWidth(String(r[key] ?? ""))));
    const headerMin = Math.ceil(displayWidth(key) / HEADER_WRAP_LINES);
    return Math.min(Math.max(maxLen + 2, COL_WIDTH_MIN, headerMin), COL_WIDTH_MAX);
  });
  worksheet["!cols"] = widths.map((wch) => ({ wch }));

  // 1행 높이 — 가장 많이 접히는 머리글에 맞춘다(접힌 글자가 잘리면 소용이 없다).
  // 🔴 접히는 열이 하나라도 있으면 한 줄 더 준다 — 엑셀이 공백에서 먼저 끊어
  //    계산보다 줄이 늘어나는 경우가 있고, 그때 마지막 줄이 잘린다.
  const wrapped = headers.some((h, i) => displayWidth(h) > widths[i]);
  const rawLines = Math.max(1, ...headers.map((h, i) => Math.ceil(displayWidth(h) / widths[i])));
  const lines = Math.min(rawLines + (wrapped ? 1 : 0), HEADER_MAX_LINES);
  worksheet["!rows"] = [{ hpt: lines * HEADER_LINE_HEIGHT + 4 }];
}

// 1행(헤더)에 은은한 배경색 + 굵은 글씨 적용, 1행 틀고정
function styleHeaderAndFreeze(worksheet: XLSX.WorkSheet, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  headers.forEach((_, col) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellRef]) return;
    worksheet[cellRef].s = {
      font: { bold: true, sz: BODY_FONT_SIZE, color: { rgb: "1A1A1A" } },
      fill: { fgColor: { rgb: "FFF3C4" } }, // 브랜드 톤에 맞춘 은은한 옐로우
      // 🔴 머리글만 접는다 — 데이터 셀까지 `wrapText` 를 걸면 행 높이가 제각각이
      //    되어 오히려 읽기 어려워진다.
      alignment: { wrapText: true, vertical: "center", horizontal: "center" },
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

/**
 * 데이터 셀 글자 크기 — 머리글은 `styleHeaderAndFreeze` 가 따로 준다.
 * 🔴 값(`v`)·타입(`t`)·서식(`z`)은 건드리지 않는다 — 금액이 숫자로 남아야 한다.
 */
function applyBodyFont(worksheet: XLSX.WorkSheet, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  for (let r = 1; r <= rows.length; r += 1) {
    headers.forEach((_, c) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) return;
      cell.s = { ...(cell.s || {}), font: { ...((cell.s || {}).font || {}), sz: BODY_FONT_SIZE } };
    });
  }
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
  applyBodyFont(worksheet, rows);
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
    applyBodyFont(worksheet, rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });
  XLSX.writeFile(workbook, filename);
}
