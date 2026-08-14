import type { SupabaseClient } from "@supabase/supabase-js";
import { exportDocumentToExcel, sanitizeFilename, type DocRow } from "@/lib/exportExcel";
import { calcVatAmount, calcInclusiveAmount } from "@/lib/vat";

// 견적서 엑셀 출력. 관리자 화면과 운송관리(화주포털) 화면이 **같은 함수를 공유**하므로
// 두 곳에서 받은 파일의 내용이 갈리지 않는다.
//
// ⚠️ **PDF 견적서와 값이 어긋나면 안 된다.** 기준 화면은
// `app/customer/quotes/[id]/print/page.tsx` (관리자용도 같은 내용)이며,
// 아래 조회 필드·계산·안내 문구를 전부 그 화면과 일치시켜 두었다.
// **PDF 견적서를 고치면 이 파일도 같이 고칠 것.**
//
// 금액은 전부 숫자로 넣는다(문자열 금지 — 자세한 이유는 `lib/exportExcel.ts`의 DocRow 주석).

export type QuoteExcelData = {
  quote: {
    id: string;
    quote_no: string | null;
    origin: string | null;
    destination: string | null;
    distance_km: number | null;
    vehicle_type: string | null;
    item: string | null;
    base_fare: number | null;
    discount_amount: number | null;
    final_amount: number | null;
    created_at: string;
    notes: string | null;
    requested_pickup_at: string | null;
    requested_dropoff_at: string | null;
    selected_options: Record<string, any> | null;
    companies: { name: string | null } | null;
  };
  items: { item_name: string | null; amount: number | null }[];
};

/**
 * 엑셀에 필요한 견적 정보를 불러온다.
 *
 * ⚠️ **권한**: 화주는 자기 회사 견적만 받을 수 있어야 한다. 이 함수는 호출한 쪽이 넘긴
 * 클라이언트를 그대로 쓰므로, 운송관리에서 `supabaseCustomer`(로그인 세션 + RLS)로
 * 호출하면 **DB가 다른 회사 견적을 애초에 내려주지 않는다**(PDF 출력 화면과 동일한 방식).
 * 견적 id를 임의로 바꿔 호출해도 조회 자체가 실패한다.
 */
export async function fetchQuoteForExcel(
  client: SupabaseClient<any, any, any>,
  quoteId: string
): Promise<QuoteExcelData> {
  const { data: quote, error } = await client
    .from("quotes")
    .select(
      "id,quote_no,origin,destination,distance_km,vehicle_type,item,base_fare,discount_amount,final_amount,created_at,notes,requested_pickup_at,requested_dropoff_at,selected_options,companies(name)"
    )
    .eq("id", quoteId)
    .single();

  if (error || !quote) {
    throw new Error(error?.message || "견적 정보를 불러오지 못했습니다.");
  }

  const { data: items } = await client
    .from("quote_items")
    .select("item_name,amount")
    .eq("quote_id", quoteId);

  return { quote: quote as any, items: (items as any) || [] };
}

function toDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** 견적서 문서를 엑셀 행으로 구성한다(PDF 견적서와 항목·값 일치) */
export function buildQuoteDocRows({ quote, items }: QuoteExcelData): DocRow[] {
  const rows: DocRow[] = [];
  const created = toDate(quote.created_at);

  // 유효기간 = 발행일 + 7일 (PDF 견적서와 동일한 규칙)
  const validUntil = created ? new Date(created) : null;
  if (validUntil) validUntil.setDate(validUntil.getDate() + 7);

  rows.push({ kind: "title", text: "견적서" });
  rows.push({ kind: "blank" });

  rows.push({ kind: "text", label: "견적번호", value: quote.quote_no || "-" });
  if (created) rows.push({ kind: "date", label: "견적일", value: created });
  if (validUntil) rows.push({ kind: "date", label: "유효기간", value: validUntil });
  rows.push({ kind: "text", label: "고객사", value: quote.companies?.name || "-" });

  rows.push({ kind: "blank" });
  rows.push({ kind: "section", text: "운송 정보" });
  rows.push({ kind: "text", label: "상차지", value: quote.origin || "-" });
  rows.push({ kind: "text", label: "하차지", value: quote.destination || "-" });
  if (quote.distance_km !== null && quote.distance_km !== undefined) {
    rows.push({ kind: "number", label: "거리", value: quote.distance_km, unit: "km" });
  }
  rows.push({ kind: "text", label: "차량 종류·톤수", value: quote.vehicle_type || "-" });
  rows.push({ kind: "text", label: "품목", value: quote.item || "-" });

  const pickup = toDate(quote.requested_pickup_at);
  const dropoff = toDate(quote.requested_dropoff_at);
  if (pickup) rows.push({ kind: "date", label: "희망 상차일시", value: pickup, withTime: true });
  if (dropoff) rows.push({ kind: "date", label: "희망 하차일시", value: dropoff, withTime: true });

  // 상·하차 조건 등 선택 옵션. PDF 견적서와 동일한 기준으로 빈 값을 걸러낸다
  const options = quote.selected_options
    ? Object.entries(quote.selected_options).filter(
        ([, v]) => v !== null && v !== undefined && v !== "" && v !== 0 && v !== false
      )
    : [];
  options.forEach(([k, v]) => {
    rows.push({
      kind: "text",
      label: k.replace(/_/g, " "),
      value: v === true ? "적용" : String(v),
    });
  });

  rows.push({ kind: "blank" });
  rows.push({ kind: "section", text: "금액" });
  rows.push({ kind: "money", label: "기본운임", value: quote.base_fare || 0 });
  items.forEach((it) => {
    rows.push({ kind: "money", label: it.item_name || "추가 항목", value: it.amount || 0 });
  });
  if (quote.discount_amount) {
    // 할인은 음수로 넣어야 받는 쪽에서 그대로 더해 합계를 검산할 수 있다
    rows.push({ kind: "money", label: "할인", value: -Math.abs(quote.discount_amount) });
  }

  const supply = quote.final_amount || 0;
  rows.push({ kind: "money", label: "공급가액 (부가세 별도)", value: supply });
  rows.push({ kind: "money", label: "부가세 (10%)", value: calcVatAmount(supply) });
  rows.push({ kind: "money", label: "합계 (부가세 포함)", value: calcInclusiveAmount(supply) });

  if (quote.notes) {
    rows.push({ kind: "blank" });
    rows.push({ kind: "text", label: "비고", value: quote.notes });
  }

  // ⚠️ 안내 문구는 PDF 견적서에 있는 것을 그대로 옮긴 것이다.
  // 엑셀만 받은 고객이 조건을 모르면 분쟁이 생기므로 빼지 말 것.
  // (무료 대기시간·대기료 단가 같은 구체 기준 표기는 별도 세션 과제이므로 여기서 손대지 않음)
  rows.push({ kind: "blank" });
  rows.push({
    kind: "note",
    text: "· 본 견적서는 상기 조건 기준이며, 실제 상하차 조건 및 대기시간에 따라 금액이 변동될 수 있습니다.",
  });
  rows.push({ kind: "note", text: "· 부가가치세(VAT)는 별도이며, 세금계산서는 정산 시 발행됩니다." });

  return rows;
}

/** 파일명 규칙: `견적서_{견적번호}_{YYYYMMDD}.xlsx` */
export function buildQuoteExcelFilename(quoteNo: string | null, createdAt: string): string {
  const d = toDate(createdAt) || new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const no = sanitizeFilename(quoteNo || "견적");
  return `견적서_${no}_${ymd}.xlsx`;
}

/** 조회 → 구성 → 파일 저장까지 한 번에. 화면에서는 이 함수만 부르면 된다. */
export async function downloadQuoteExcel(client: SupabaseClient<any, any, any>, quoteId: string) {
  const data = await fetchQuoteForExcel(client, quoteId);
  const rows = buildQuoteDocRows(data);
  const filename = buildQuoteExcelFilename(data.quote.quote_no, data.quote.created_at);
  exportDocumentToExcel(filename, "견적서", rows);
}
