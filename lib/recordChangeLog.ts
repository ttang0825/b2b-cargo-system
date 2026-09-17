// ─────────────────────────────────────────────────────────────────────────────
// 견적·운송오더 **수정 이력** — 유일 정의처 (2026-09-17)
//
// 사용자 지시: *「견적상세와 운송오더 상세에는 견적과 운송오더가 수정된 이력이 어딘가
// 남아 있으면 좋겠다」*
//
// 바로 앞 차수(PR #172)가 **견적 금액을 고치면 연결된 오더 청구금액이 따라오게** 만들면서
// 「누가 언제 얼마를 얼마로 바꿨나」가 두 화면에 걸쳐 흩어지게 됐다. 그전에는 상세 아래
// `ProcessedByFooter` 가 **「최종수정: 이름 (날짜)」 한 줄**만 보여줬을 뿐이라
// **무엇이 바뀌었는지는 어디에도 남지 않았다.**
//
// 🔴 **표는 `activity_logs` 다 — 새로 만들지 않았다.** 21차가 「쓰이지 않는 6개」로
//    분류해 RLS 만 켜 두고 *「나중에 쓸 일이 생기면 그때 정책을 만들면 된다」*고 남긴
//    표이고, 컬럼이 정확히 이 용도다(`table_name`·`record_id`·`action`·`changed_fields`).
//    🔴 **`record_change_logs` 같은 표를 새로 만들지 말 것.**
//
// 🔴 **값은 기록 시점의 「보이는 문자열」로 굳힌다**(`130,000원` · `2026-09-17 14:00` ·
//    `혼적가능`). 감사 기록이라 **그때 화면에 뭐라고 쓰여 있었는지**가 남아야 하고,
//    나중에 라벨을 바꿔도 옛 기록의 뜻이 달라지면 안 된다.
//    🔴 **원본 값(숫자·코드)만 저장하고 읽을 때 포맷하지 말 것.**
//
// 🔴 **직원 이름도 굳혀 저장한다**(`by`) — 원칙 32번의 「표시용 텍스트 스냅샷」이다.
//    `user_id` 외래키가 `on delete set null` 이라, 퇴사 직원 행이 지워져도 「누가」가
//    남아야 한다.
//
// ⚠️ **위조를 막는 장치가 아니다.** 화면(클라이언트)이 직접 insert 한다 —
//    `lib/settlementTypeChangeLog.ts` 와 같은 방식이다. 애초에 그 담당자는 **그 레코드
//    자체를 고칠 수 있는 사람**이라 서버 API 를 하나 더 둬도 얻는 것이 없고(저장 자체가
//    클라이언트에서 일어난다), 저장 경로만 둘로 갈린다. **되짚기 위한 기록이지
//    부인방지 장치가 아니다.**
//
// 🔴 **정산방식 로그와 겹치지 않는다** — `settlement_field_change_logs`(사유 필수 ·
//    orders/dispatches/invoices)는 원칙 39번이 잠근 필드 전용이고, 오더 상세의 일반
//    저장 폼에는 그 필드가 **없다**(전용 모달에서만 바뀐다). 견적에는 그 로그 자체가
//    걸려 있지 않아 여기서 처음 남는다.
// ─────────────────────────────────────────────────────────────────────────────

export const RECORD_CHANGE_LOG_TABLE = "activity_logs";

/** 🔴 이 두 표만이다 — 늘리려면 아래 라벨 맵도 같이 늘려야 한다(라벨이 없으면 안 남는다). */
export type RecordChangeTarget = "quotes" | "orders";

export type RecordChange = {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
};

export type RecordChangeLogRow = {
  id: string;
  created_at: string;
  by: string | null;
  changes: RecordChange[];
};

/* ── 값 → 보이는 문자열 ─────────────────────────────────────────────────────── */

function fmtText(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function fmtWon(v: any): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${Math.round(n).toLocaleString()}원`;
}

function fmtNumber(unit: string) {
  return (v: any): string | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return `${n.toLocaleString()}${unit}`;
  };
}

function fmtBool(yes: string, no: string) {
  return (v: any): string | null => (v == null ? null : v ? yes : no);
}

/**
 * 🔴 **`toLocaleString` 으로 보는 사람의 로컬 TZ 기준** — 원칙 41번이 다루는 저장 포맷과
 *    별개로, 이력에 남는 것은 **그때 담당자가 화면에서 본 시각**이어야 한다.
 *    🔴 `hour12: false` 를 빼지 말 것(관리자 화면은 전부 24시간 표기다).
 */
function fmtDateTime(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtMap(map: Record<string, string>) {
  return (v: any): string | null => {
    const s = fmtText(v);
    if (s == null) return null;
    return map[s] || s;
  };
}

type FieldSpec = { label: string; format: (v: any) => string | null };

const T = (label: string): FieldSpec => ({ label, format: fmtText });
const WON = (label: string): FieldSpec => ({ label, format: fmtWon });
const DT = (label: string): FieldSpec => ({ label, format: fmtDateTime });

const LOADING_TYPE = fmtMap({ exclusive: "독차", mixable: "혼적가능" });
const DISCOUNT_TYPE = fmtMap({ amount: "정액", percent: "율(%)" });
const COLLECTION_METHOD = fmtMap({ broker: "주선사 수금", driver_direct: "선착불(차주 직접수금)" });
const BILLING_CYCLE = fmtMap({ per_order: "건별", monthly: "월정산" });
const COLLECTION_POINT = fmtMap({ pickup: "상차지", dropoff: "하차지", undecided: "미정" });

/**
 * 🔴 **여기에 있는 필드만 이력에 남는다.** 일부러 뺀 것들 —
 *    - `*_sido` / `*_sigungu` : 주소에서 파생된 값이라 주소 줄과 **두 번** 남는다
 *    - `updated_by` / `updated_at` : 「누가·언제」는 이력 자체가 이미 담는다
 *    - `settlement_type` : 신규 3필드에서 파생된 구형 값이다(원칙 45번)
 *    - `selected_options.톤수` : `vehicle_type` 과 같은 값이다
 *    - `selected_options.첫거래지원할인` : 담당자가 고치는 값이 아니다(16차에 화면에서 뺐다)
 */
const FIELD_SPECS: Record<RecordChangeTarget, Record<string, FieldSpec>> = {
  quotes: {
    origin: T("출발지"),
    destination: T("도착지"),
    origin_company_name: T("상차지 상호"),
    origin_contact_name: T("상차지 담당자"),
    origin_contact_phone: T("상차지 연락처"),
    destination_company_name: T("하차지 상호"),
    destination_contact_name: T("하차지 담당자"),
    destination_contact_phone: T("하차지 연락처"),
    distance_km: { label: "거리", format: fmtNumber("km") },
    vehicle_type: T("차량 톤수"),
    item: T("품목"),
    requested_pickup_at: DT("희망 상차일시"),
    requested_dropoff_at: DT("희망 하차일시"),
    notes: T("특이사항"),
    // 🔴 **빼지 말 것** — 2026-09-17 부터 「최종금액 직접 입력」의 차액이 이 값에
    //    흡수된다(`baseFareAbsorbingAdjustment`). 36차 E장이 「기본운임을 덮어쓰면
    //    운임기준표에서 나온 값이라는 사실이 사라진다」고 반대했던 자리이고,
    //    **그 걱정에 답하는 것이 바로 이 줄이다.**
    base_fare: WON("기본운임"),
    final_amount: WON("최종 견적금액"),
    loading_type: { label: "적재구분", format: LOADING_TYPE },
    mixed_shipper_consent: { label: "혼적 화주동의", format: fmtBool("동의", "미동의") },
    mixed_discount_type: { label: "혼적 할인유형", format: DISCOUNT_TYPE },
    mixed_discount_amount: WON("혼적 할인액"),
    mixed_discount_percent: { label: "혼적 할인율", format: fmtNumber("%") },
    mixed_note: T("혼적 주의사항"),
    collection_method: { label: "운임 수금방식", format: COLLECTION_METHOD },
    billing_cycle: { label: "청구주기", format: BILLING_CYCLE },
    direct_collection_point: { label: "선착불 지급조건", format: COLLECTION_POINT },
    // `selected_options`(jsonb) 안의 한글 키 — 아래 `flattenSelectedOptions()` 가 펴서 넣는다
    차량형태: T("차량형태"),
    상차조건: T("상차조건"),
    하차조건: T("하차조건"),
    물품특성: T("물품특성"),
    운송시간: T("운송시간"),
    "왕복/편도": T("왕복/편도"),
    대기시간_분: { label: "대기시간", format: fmtNumber("분") },
    경유지수: { label: "경유지 수", format: fmtNumber("곳") },
  },
  orders: {
    status: T("진행 상태"),
    origin: T("출발지"),
    destination: T("도착지"),
    origin_company_name: T("상차지 상호"),
    origin_contact_name: T("상차지 담당자"),
    origin_contact_phone: T("상차지 연락처"),
    destination_company_name: T("하차지 상호"),
    destination_contact_name: T("하차지 담당자"),
    destination_contact_phone: T("하차지 연락처"),
    vehicle_type: T("차량 톤수"),
    customer_charge: WON("화주 청구금액"),
    customer_charge_vat_included: {
      label: "청구금액 부가세",
      format: fmtBool("부가세 포함", "부가세 별도"),
    },
    item: T("품목"),
    requested_pickup_at: DT("상차 예정일시"),
    requested_delivery_at: DT("하차 예정일시"),
    load_condition: T("상차조건"),
    unload_condition: T("하차조건"),
    special_notes: T("특이사항"),
    loading_type: { label: "적재구분", format: LOADING_TYPE },
    mixed_shipper_consent: { label: "혼적 화주동의", format: fmtBool("동의", "미동의") },
    mixed_discount_type: { label: "혼적 할인유형", format: DISCOUNT_TYPE },
    mixed_discount_amount: WON("혼적 할인액"),
    mixed_discount_percent: { label: "혼적 할인율", format: fmtNumber("%") },
    mixed_note: T("혼적 주의사항"),
  },
};

/**
 * `selected_options`(견적 전용 jsonb)를 한 겹 펴서 같은 평면에 올린다.
 *
 * 🔴 **`quotes` 는 상차조건·차량형태 등을 컬럼이 아니라 이 jsonb 안에 한글 키로 담는다**
 *    (§7 의 그 함정이고 PR #152·#153 이 같은 자리에서 두 번 걸렸다). 펴지 않으면
 *    견적에서 **차량형태를 바꿔도 이력에 아무것도 안 남는다.**
 */
function flattenSelectedOptions(row: any): Record<string, any> {
  if (!row || typeof row !== "object") return {};
  const opts = (row as any).selected_options;
  const flat: Record<string, any> = { ...row };
  delete flat.selected_options;
  if (opts && typeof opts === "object") {
    Object.keys(opts).forEach((k) => {
      // 🔴 같은 이름의 진짜 컬럼이 있으면 그쪽이 이긴다(지금은 겹치는 것이 없다).
      if (!(k in flat)) flat[k] = (opts as any)[k];
    });
  }
  return flat;
}

/**
 * 저장 전/후를 견줘 **바뀐 것만** 뽑는다.
 *
 * 🔴 **표시 문자열끼리 비교한다** — `numeric` 이 `130000.00` 으로, 입력창이 `130000`
 *    으로 돌아오는 것을 그냥 견주면 **안 고친 필드가 매번 「바뀜」으로 남아** 이력이
 *    쓸모없어진다. 포맷터를 통과시킨 뒤 비교하면 그 차이가 사라진다.
 */
export function diffRecordFields(
  target: RecordChangeTarget,
  before: any,
  after: any
): RecordChange[] {
  const specs = FIELD_SPECS[target];
  const b = flattenSelectedOptions(before);
  const a = flattenSelectedOptions(after);
  const out: RecordChange[] = [];
  Object.keys(specs).forEach((field) => {
    // 🔴 저장 payload 에 없는 필드는 「비웠다」가 아니라 **안 건드린 것**이다.
    if (!(field in a)) return;
    const spec = specs[field];
    const bv = spec.format(b[field]);
    const av = spec.format(a[field]);
    if (bv === av) return;
    out.push({ field, label: spec.label, before: bv, after: av });
  });
  return out;
}

/** 최소한의 질의 인터페이스 — 화면이 쓰는 클라이언트를 그대로 받는다(목으로 갈아끼우기 쉽다). */
type LogClient = { from: (table: string) => any };

/**
 * 수정 이력 한 건을 남긴다.
 *
 * 🔴 **바뀐 것이 없으면 아무것도 쓰지 않는다** — 「저장 버튼을 눌렀다」는 이력이 아니다.
 * 🔴 **실패해도 저장 자체를 되돌리지 않는다.** 다만 **조용히 넘어가지도 않는다**
 *    (원칙 55번) — 호출부가 화면에 알린다.
 */
export async function logRecordChange(
  client: LogClient,
  params: {
    target: RecordChangeTarget;
    recordId: string;
    staffId: string | null;
    staffName: string | null;
    changes: RecordChange[];
  }
): Promise<{ logged: boolean; error: string | null }> {
  if (params.changes.length === 0) return { logged: false, error: null };
  const { error } = await (client as any).from(RECORD_CHANGE_LOG_TABLE).insert({
    user_id: params.staffId,
    table_name: params.target,
    record_id: params.recordId,
    action: "update",
    changed_fields: { by: params.staffName || null, changes: params.changes },
  });
  if (error) return { logged: false, error: error.message };
  return { logged: true, error: null };
}

/**
 * 한 레코드의 수정 이력을 최신순으로 읽는다.
 *
 * 🔴 **`error` 를 삼키지 않는다**(원칙 55번) — 조용히 빈 목록이 되면 화면에는
 *    「수정된 적이 없습니다」로 보여서, 이력이 안 쌓이는 것인지 못 읽는 것인지 알 수 없다.
 */
export async function fetchRecordChangeLogs(
  client: LogClient,
  target: RecordChangeTarget,
  recordId: string,
  limit = 50
): Promise<{ rows: RecordChangeLogRow[]; error: string | null }> {
  const { data, error } = await (client as any)
    .from(RECORD_CHANGE_LOG_TABLE)
    .select("id,created_at,changed_fields")
    .eq("table_name", target)
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { rows: [], error: error.message };
  const rows: RecordChangeLogRow[] = (data || []).map((r: any) => ({
    id: r.id,
    created_at: r.created_at,
    by: r.changed_fields?.by ?? null,
    changes: Array.isArray(r.changed_fields?.changes) ? r.changed_fields.changes : [],
  }));
  return { rows, error: null };
}

/** 이력 줄의 시각 표기 — `formatCustomerApprovedAt()` 와 같은 결(24시간 표기). */
export function formatChangeLogAt(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 값이 비어 있을 때의 표기 — 「(없음)」이 「빈 문자열로 바꿨다」보다 읽힌다. */
export const CHANGE_EMPTY_LABEL = "(없음)";
