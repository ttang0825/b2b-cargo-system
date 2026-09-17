"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { VEHICLE_TYPES_ALL } from "@/lib/constants";
import { STATUS_OPTIONS as COMPANY_STATUS_ORDER } from "@/lib/statusColors";
import { getCurrentStaffId, getCurrentStaffName, getCurrentStaffRole } from "@/lib/currentStaff";
import { LOADING_METHOD_OPTIONS } from "@/lib/loadingMethods";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { calcInclusiveAmount } from "@/lib/vat";
import { downloadQuoteExcel } from "@/lib/quoteExcel";
import { optimisticUpdate } from "@/lib/optimisticUpdate";
import { notifyPortalPush } from "@/lib/notifyPortalPush";
import {
  getMixedLoadingDiscountTiers,
  pickMixedDiscountTier,
  MixedLoadingDiscountTierRow,
} from "@/lib/mixedLoadingDiscountSettings";
import MixedDiscountStandardHint from "@/components/MixedDiscountStandardHint";
import AddressSearch from "@/components/AddressSearch";
import PickupDropoffContactFields, {
  EMPTY_PICKUP_DROPOFF_CONTACT,
} from "@/components/PickupDropoffContactFields";
import DateTimePicker from "@/components/DateTimePicker";
import { localInputToISOString, toLocalDateTimeInput } from "@/lib/localDateTime";
import MoneyInput from "@/components/MoneyInput";
import ProcessedByFooter from "@/components/ProcessedByFooter";
import SmsLogPanel from "@/components/SmsLogPanel";
import SmsConfirmModal, { SmsPreview } from "@/components/SmsConfirmModal";
import ConflictWarning from "@/components/ConflictWarning";
import PrintModal from "@/components/PrintModal";
import CollectionMethodInput, { CollectionMethodValue } from "@/components/CollectionMethodInput";
import { getSettlementDisplayLabel, getPaymentConditionLabel, mapToLegacySettlementType } from "@/lib/settlementLabels";
// 🔴 차량형태 선택지는 DB(`rate_surcharges`)가 정본이고 **표시 순서만** 코드가 정한다.
//    모르는 옵션은 버리지 않고 맨 뒤에 붙인다(`lib/vehicleBodyTypes.ts` 참고).
import { orderBodyTypes } from "@/lib/vehicleBodyTypes";
import { CUSTOMER_APPROVED_LABEL, formatCustomerApprovedAt } from "@/lib/quoteApproval";
import {
  calcQuoteAdjustment,
  shouldShowAdjustment,
  formatAdjustment,
  QUOTE_ADJUSTMENT_LABEL,
} from "@/lib/quoteAdjustment";
import { baseFareAbsorbingAdjustment } from "@/lib/quoteFareLines";
import {
  QUOTE_REVISE_AMOUNT_PARAM,
  QUOTE_REVISE_AMOUNT_VALUE,
  QUOTE_REVISE_AMOUNT_NOTICE,
} from "@/lib/dispatchCancel";
import {
  minDropoffDateTime as minDropoffDateTimeOf,
  isDropoffGapOk,
  DROPOFF_MIN_GAP_LABEL,
} from "@/lib/dropoffGap";
// 🔴 등록 폼과 **같은 칩**을 쓴다(36차 PR 2 리뷰 2라운드) — 한쪽에만 있으면 담당자가
//    수정 화면에서 당착을 고를 길이 없어 특이사항을 손으로 적게 된다.
import { buildNotesWithArrival, arrivalTypeLabel, ARRIVAL_TIME_FREE_NOTE } from "@/lib/arrivalType";
// 🔴 **`<option value>` 는 DB 값 그대로 두고 보이는 글자만 바꾼다** —
//    값까지 바꾸면 `quotes_status_check` 위반으로 상태 변경이 실패한다.
import { quoteStatusAdminLabel } from "@/lib/quoteStatusLabels";
import {
  amountSyncConfirmMessage,
  needsAmountSyncConfirm,
  ordersNeedingAmountSync,
  syncQuoteAmountToOrders,
  type LinkedOrder,
} from "@/lib/quoteAmountSync";
import { isQuoteRevision } from "@/lib/quoteRevision";
import {
  diffRecordFields,
  logRecordChange,
} from "@/lib/recordChangeLog";
import RecordChangeLogPanel from "@/components/RecordChangeLogPanel";

const STATUS_OPTIONS = ["상담중", "견적제출", "수주", "보류", "실패"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  상담중: { bg: "#EFF6FF", text: "#3B82F6" },
  견적제출: { bg: "#EDE9FE", text: "#7C3AED" },
  수주: { bg: "#D1FAE5", text: "#059669" },
  보류: { bg: "#FEF3C7", text: "#B45309" },
  실패: { bg: "#FEE2E2", text: "#B91C1C" },
};

// .field input 전역 CSS(width:100%, padding, border-radius 등)가 텍스트
// 입력창 기준이라 체크박스/라디오에 그대로 적용되면 뭉개져 보임 — 명시적으로
// 원래 크기로 되돌림
const CHECKBOX_STYLE: React.CSSProperties = { width: "auto", flexShrink: 0 };

type QuoteItem = { id: string; item_name: string | null; amount: number | null };

type Surcharge = { category: string; option_name: string };

type QuoteDetail = {
  id: string;
  quote_no: string | null;
  /** 화주가 포털에서 직접 승인한 시각. null 이면 담당자가 손으로 바꾼 것이다. */
  approved_by_customer_at: string | null;
  origin: string | null;
  origin_sido: string | null;
  origin_sigungu: string | null;
  destination: string | null;
  destination_sido: string | null;
  destination_sigungu: string | null;
  origin_company_name: string | null;
  origin_contact_name: string | null;
  origin_contact_phone: string | null;
  destination_company_name: string | null;
  destination_contact_name: string | null;
  destination_contact_phone: string | null;
  distance_km: number | null;
  vehicle_type: string | null;
  item: string | null;
  base_fare: number | null;
  surcharge_amount: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  status: string;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  company_id: string | null;
  selected_options: Record<string, any> | null;
  loading_type: string | null;
  mixed_shipper_consent: boolean | null;
  mixed_discount_type: string | null;
  mixed_discount_amount: number | null;
  mixed_discount_percent: number | null;
  mixed_note: string | null;
  notes: string | null;
  requested_pickup_at: string | null;
  requested_dropoff_at: string | null;
  collection_method: string | null;
  billing_cycle: string | null;
  direct_collection_point: string | null;
  companies: { id: string; name: string; phone: string | null } | null;
};

function formatDateTime(v: string | null) {
  if (!v) return null;
  return new Date(v).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function wonVatIncluded(n: number | null | undefined) {
  if (!n) return null;
  return calcInclusiveAmount(n).toLocaleString("ko-KR") + "원";
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [mixedDiscountTiers, setMixedDiscountTiers] = useState<MixedLoadingDiscountTierRow[]>([]);
  // 🔴 **건수가 아니라 행을 들고 있어야 한다** — 견적 금액을 고칠 때 그 오더들의
  //    청구금액을 같이 맞춘다(`lib/quoteAmountSync.ts`). 그전에는 `count` 만 셌다.
  const [linkedOrders, setLinkedOrders] = useState<LinkedOrder[]>([]);
  const hasOrder = linkedOrders.length > 0;
  const [amountSyncNotice, setAmountSyncNotice] = useState<string | null>(null);
  const [linkedOrdersError, setLinkedOrdersError] = useState<string | null>(null);
  /** 저장이 끝나면 올려서 수정 이력 패널을 다시 읽게 한다(펼쳐 둔 채로 저장했을 때) */
  const [changeLogKey, setChangeLogKey] = useState(0);
  /**
   * 🔴 「운임료 조정 필요」로 배차를 취소하면 이 화면으로 **금액을 고치라고** 보내진다
   *    (`lib/dispatchCancel.ts`). 그때 편집을 열고 금액 칸을 옅은 빨강으로 강조한다.
   * 🔴 **저장하면 꺼진다** — 안 끄면 고친 뒤에도 계속 빨갛다.
   */
  const searchParams = useSearchParams();
  const [reviseAmount, setReviseAmount] = useState(false);
  const [sendingQuoteSms, setSendingQuoteSms] = useState(false);
  const [quoteSmsSent, setQuoteSmsSent] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [quoteSmsError, setQuoteSmsError] = useState<string | null>(null);
  const [smsPreview, setSmsPreview] = useState<SmsPreview | null>(null);

  /**
   * 🔴 수정 화면의 「지금」·「당착/내착」 — 등록 폼과 같다. `quotes` 에 도착구분 컬럼이
   *    없으므로(28차 결정 1) **불러올 때는 항상 꺼진 상태로 시작한다.**
   *    이미 특이사항에 줄이 있으면 저장할 때 다시 붙지 않는다(`buildNotesWithArrival`).
   */
  const [pickupNow, setPickupNow] = useState(false);
  const [dropoffArrivalType, setDropoffArrivalType] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    collection_method: "broker" as CollectionMethodValue["collection_method"],
    billing_cycle: "per_order" as CollectionMethodValue["billing_cycle"],
    direct_collection_point: null as CollectionMethodValue["direct_collection_point"],
    origin: "",
    originDetail: "",
    originSido: "",
    originSigungu: "",
    destination: "",
    destinationDetail: "",
    destinationSido: "",
    destinationSigungu: "",
    ...EMPTY_PICKUP_DROPOFF_CONTACT,
    distance_km: "",
    vehicle_type: "1톤",
    item: "",
    차량형태: "",
    상차조건: LOADING_METHOD_OPTIONS[0],
    하차조건: LOADING_METHOD_OPTIONS[0],
    물품특성: "",
    운송시간: "",
    "왕복/편도": "",
    waitingMinutes: "",
    waypointCount: "",
    requested_pickup_at: "",
    requested_dropoff_at: "",
    notes: "",
    final_amount: "",
    loading_type: "exclusive" as "exclusive" | "mixable",
    mixed_shipper_consent: false,
    mixed_discount_type: null as "amount" | "percent" | null,
    mixed_discount_amount: "",
    mixed_discount_percent: "",
    mixed_note: "",
  });

  // 희망 상차일시는 현재 시각 이후로만 선택 가능 (원칙 6번)

  // 입력된 거리에 해당하는 표준 혼적 할인율 구간 (없으면 null — 거리 미입력)
  const mixedDiscountTier = useMemo(
    () => pickMixedDiscountTier(mixedDiscountTiers, Number(editForm.distance_km) || null),
    [mixedDiscountTiers, editForm.distance_km]
  );

  // 최소 하차일시 — 🔴 **거리와 무관하게 상차 +30분**이다(36차 D장). 정의처는
  // `lib/dropoffGap.ts` 하나이고 등록 폼·화주포털 발주요청도 같은 값을 쓴다.
  const minDropoffDateTime = useMemo(
    () => minDropoffDateTimeOf(editForm.requested_pickup_at),
    [editForm.requested_pickup_at]
  );

  const minDropoffLabel = editForm.requested_pickup_at ? DROPOFF_MIN_GAP_LABEL : undefined;

  // 🔴 items 조회가 끝난 뒤에 계산해야 한다 — 빈 배열로 계산하면 가산액만큼이
  //    통째로 「조정」으로 보인다(`lib/quoteAdjustment.ts` 주석 참고).
  const quoteAdjustment = calcQuoteAdjustment(quote || {}, items);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
    getMixedLoadingDiscountTiers().then(({ rows }) => setMixedDiscountTiers(rows));
    supabase
      .from("rate_surcharges")
      .select("category,option_name")
      .then(({ data }) => setSurcharges((data as Surcharge[]) || []));
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("*, companies(id,name,phone,billing_cycle_default)")
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setQuote(data as any);
    const options = (data.selected_options as any) || {};
    setEditForm({
      origin: data.origin || "",
      originDetail: "",
      originSido: data.origin_sido || "",
      originSigungu: data.origin_sigungu || "",
      destination: data.destination || "",
      destinationDetail: "",
      destinationSido: data.destination_sido || "",
      destinationSigungu: data.destination_sigungu || "",
      origin_company_name: data.origin_company_name || "",
      origin_contact_name: data.origin_contact_name || "",
      origin_contact_phone: data.origin_contact_phone || "",
      destination_company_name: data.destination_company_name || "",
      destination_contact_name: data.destination_contact_name || "",
      destination_contact_phone: data.destination_contact_phone || "",
      distance_km: data.distance_km ? String(data.distance_km) : "",
      vehicle_type: data.vehicle_type || "1톤",
      item: data.item || "",
      차량형태: options.차량형태 || "",
      상차조건: options.상차조건 || LOADING_METHOD_OPTIONS[0],
      하차조건: options.하차조건 || LOADING_METHOD_OPTIONS[0],
      물품특성: options.물품특성 || "",
      운송시간: options.운송시간 || "",
      "왕복/편도": options["왕복/편도"] || "",
      waitingMinutes: options.대기시간_분 ? String(options.대기시간_분) : "",
      waypointCount: options.경유지수 ? String(options.경유지수) : "",
      requested_pickup_at: toLocalDateTimeInput(data.requested_pickup_at),
      requested_dropoff_at: toLocalDateTimeInput(data.requested_dropoff_at),
      notes: data.notes || "",
      final_amount: data.final_amount != null ? String(Math.round(data.final_amount)) : "",
      loading_type: (data.loading_type as "exclusive" | "mixable") || "exclusive",
      mixed_shipper_consent: data.mixed_shipper_consent || false,
      mixed_discount_type: (data.mixed_discount_type as "amount" | "percent" | null) || null,
      mixed_discount_amount: data.mixed_discount_amount ? String(data.mixed_discount_amount) : "",
      mixed_discount_percent: data.mixed_discount_percent ? String(data.mixed_discount_percent) : "",
      mixed_note: data.mixed_note || "",
      collection_method: (data.collection_method as CollectionMethodValue["collection_method"]) || "broker",
      billing_cycle: (data.billing_cycle as CollectionMethodValue["billing_cycle"]) || "per_order",
      direct_collection_point:
        (data.direct_collection_point as CollectionMethodValue["direct_collection_point"]) || null,
    });

    const { data: itemData } = await supabase
      .from("quote_items")
      .select("id,item_name,amount")
      .eq("quote_id", id);
    setItems(itemData || []);

    // 🔴 조회 실패를 삼키면 「금액을 고쳤는데 오더가 안 따라왔다」가 조용히 일어난다
    //    (원칙 55번) — 그때는 아래 저장이 오더를 **아예 손대지 않는다.**
    const { data: orderRows, error: orderErr } = await supabase
      .from("orders")
      // 🔴 `customer_charge_vat_included` 는 **수정 이력의 「전」**에 쓴다 — 빼면
      //    안 바뀐 건도 「부가세 별도로 바뀜」으로 남는다.
      .select("id,order_no,status,customer_charge,customer_charge_vat_included")
      .eq("quote_id", id);
    setLinkedOrdersError(orderErr ? orderErr.message : null);
    setLinkedOrders((orderRows || []) as LinkedOrder[]);

    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* 🔴 배차 취소(운임료 조정 필요)에서 넘어온 경우 — 편집을 열고 금액을 강조한다.
     🔴 **`quote` 가 들어온 뒤에 연다** — 먼저 열면 `editForm` 이 아직 비어 있어
        담당자가 빈 칸을 본다(`load()` 가 채운다). */
  useEffect(() => {
    if (!quote) return;
    if (
      searchParams?.get(QUOTE_REVISE_AMOUNT_PARAM) === QUOTE_REVISE_AMOUNT_VALUE
    ) {
      setEditing(true);
      setReviseAmount(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.id]);

  async function handleStatusChange(status: string) {
    const staffId = await getCurrentStaffId();
    const prevStatus = quote?.status;
    const { error } = await supabase
      .from("quotes")
      .update({ status, updated_by: staffId })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setQuote((q) => (q ? { ...q, status } : q));

    // 🔴 화주포털 푸시 — **「견적제출」로 새로 바뀜 때뿐이다.**
    //    같은 값을 다시 고르는 일이 흔한데 그때마다 화주 폰이 울리면 알림을 꺼 버린다.
    //    🔴 **`await` 하지 않는다**(원칙 53번) · 🔴 **회사는 서버가 다시 찾는다**(원칙 30번).
    //    ⚠️ 게스트 견적(`company_id` 없음)은 서버가 조용히 건너뛴다 — 보낼 곳이 없다.
    if (status === "견적제출" && prevStatus !== "견적제출") {
      notifyPortalPush("quote", id, "quote_submitted");
    }

    // 견적을 실제로 화주에게 "발송"한 시점 = 화주 영업상태도 "견적발송"으로 승격 (뒤로는 안 돌아감)
    if (status === "견적제출" && quote?.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("status")
        .eq("id", quote.company_id)
        .single();
      if (company) {
        const currentIdx = COMPANY_STATUS_ORDER.indexOf(
          company.status as any
        );
        const targetIdx = COMPANY_STATUS_ORDER.indexOf("견적발송" as any);
        if (currentIdx === -1 || currentIdx < targetIdx) {
          await supabase
            .from("companies")
            .update({ status: "견적발송", updated_by: staffId })
            .eq("id", quote.company_id);
        }
      }
    }
  }

  async function handleQuoteExcel() {
    if (!quote) return;
    setExcelBusy(true);
    try {
      await downloadQuoteExcel(supabase, quote.id);
    } catch (e: any) {
      // 액션 실패는 페이지 전체를 덮지 않고 알림으로만(원칙 33번)
      alert(e?.message || "견적서 엑셀을 만들지 못했습니다.");
    } finally {
      setExcelBusy(false);
    }
  }

  async function handleSendQuoteSms() {
    if (!quote) return;
    setSendingQuoteSms(true);
    setQuoteSmsError(null);
    try {
      // 미리보기만 요청 — 실제 발송은 SmsConfirmModal에서 확인·수정 후
      // /api/admin/send-sms로만 일어남(PR #73 리뷰 반영)
      const previewRes = await fetch("/api/admin/send-quote-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quote.id }),
      });
      const preview = await previewRes.json();
      if (!previewRes.ok) {
        setQuoteSmsError(preview.error || "문자 미리보기를 불러오지 못했습니다.");
        return;
      }
      setSmsPreview(preview);
    } catch {
      setQuoteSmsError("문자 미리보기를 불러오지 못했습니다.");
    } finally {
      setSendingQuoteSms(false);
    }
  }

  async function handleSave(force = false) {
    if (!quote) return;
    setSaveError(null);
    setConflict(false);

    const settlementFieldsChanged =
      editForm.collection_method !== (quote.collection_method || "broker") ||
      editForm.billing_cycle !== (quote.billing_cycle || "per_order") ||
      editForm.direct_collection_point !== (quote.direct_collection_point || null);
    if (hasOrder && settlementFieldsChanged) {
      const proceed = window.confirm(
        "이 견적은 이미 오더로 전환되어, 여기서 수정해도 기존 오더에는 반영되지 않습니다. 계속 저장하시겠습니까?"
      );
      if (!proceed) return;
    }

    // 🔴 입력창 하한과 **같은 규칙을 제출 직전에 한 번 더** 본다(등록 폼과 동일).
    // 🔴 당착·내착은 예외다(27차) — 시각이 무관한 선택지라 밤 상차 건이 막힌다
    if (
      !dropoffArrivalType &&
      !isDropoffGapOk(editForm.requested_pickup_at, editForm.requested_dropoff_at)
    ) {
      setSaveError(`희망 하차일시는 ${DROPOFF_MIN_GAP_LABEL}.`);
      return;
    }


    /* ── 견적 금액 → 연결된 오더 청구금액 ─────────────────────────────────────
       🔴 사용자 지시 2026-09-17: *「기존견적에서 금액을 올리는 수정을 하면 이와 연결되어
          있던 오더도 그 금액이 자동으로 적용되면 좋겠다」*.
       🔴 **묻지 않고 바로 반영하는 것이 기본이다**(그것이 지시다) — 배차가 이미 내려간
          오더일 때만 한 번 확인한다(`lib/quoteAmountSync.ts`). */
    const nextAmount = Number(editForm.final_amount) || null;
    const amountTargets =
      nextAmount != null ? ordersNeedingAmountSync(linkedOrders, nextAmount) : [];
    if (amountTargets.length > 0 && needsAmountSyncConfirm(amountTargets)) {
      if (!window.confirm(amountSyncConfirmMessage(amountTargets, nextAmount as number))) return;
    }

    setSaving(true);

    const fullOrigin = [editForm.origin, editForm.originDetail].filter((v) => v.trim()).join(" ");
    const fullDestination = [editForm.destination, editForm.destinationDetail]
      .filter((v) => v.trim())
      .join(" ");

    const payload = {
      origin: fullOrigin || null,
      origin_sido: editForm.originSido || null,
      origin_sigungu: editForm.originSigungu || null,
      destination: fullDestination || null,
      destination_sido: editForm.destinationSido || null,
      destination_sigungu: editForm.destinationSigungu || null,
      origin_company_name: editForm.origin_company_name.trim() || null,
      origin_contact_name: editForm.origin_contact_name.trim() || null,
      origin_contact_phone: editForm.origin_contact_phone.trim() || null,
      destination_company_name: editForm.destination_company_name.trim() || null,
      destination_contact_name: editForm.destination_contact_name.trim() || null,
      destination_contact_phone: editForm.destination_contact_phone.trim() || null,
      distance_km: Number(editForm.distance_km) || null,
      vehicle_type: editForm.vehicle_type,
      item: editForm.item || null,
      requested_pickup_at: pickupNow
        ? new Date().toISOString()
        : localInputToISOString(editForm.requested_pickup_at),
      requested_dropoff_at: localInputToISOString(editForm.requested_dropoff_at),
      // 🔴 도착구분 한 줄을 특이사항으로 잇는다 — 이미 있으면 다시 붙이지 않는다
      notes: buildNotesWithArrival(editForm.notes, dropoffArrivalType) || null,
      final_amount: Number(editForm.final_amount) || null,
      /* 🔴 **차액은 「조정」 줄이 아니라 기본운임으로 흡수된다**(사용자 지시 2026-09-17:
         *「계산 내역에 "조정"으로 들어가지 말고 기본운임에 들어가게 하자」*).
         ⚠️ **36차 E장의 「기본운임을 덮어쓰지 않는다」를 뒤집은 것이다** — 사유와
            되돌리기 금지는 `lib/quoteFareLines.ts` 의 `baseFareAbsorbingAdjustment()` 머리말.
         🔴 **금액이 비어 있으면 손대지 않는다**(그 함수가 `null` 을 돌려준다). */
      ...(baseFareAbsorbingAdjustment(quote, items, nextAmount) != null
        ? { base_fare: baseFareAbsorbingAdjustment(quote, items, nextAmount) }
        : {}),
      loading_type: editForm.loading_type,
      mixed_shipper_consent: editForm.loading_type === "mixable" ? editForm.mixed_shipper_consent : false,
      mixed_discount_type: editForm.loading_type === "mixable" ? editForm.mixed_discount_type : null,
      mixed_discount_amount: Number(editForm.mixed_discount_amount) || 0,
      mixed_discount_percent: Number(editForm.mixed_discount_percent) || 0,
      mixed_note: editForm.loading_type === "mixable" ? editForm.mixed_note || null : null,
      collection_method: editForm.collection_method,
      billing_cycle: editForm.billing_cycle,
      direct_collection_point:
        editForm.collection_method === "driver_direct" ? editForm.direct_collection_point : null,
      ...(mapToLegacySettlementType(editForm.collection_method, editForm.billing_cycle, editForm.direct_collection_point)
        ? {
            settlement_type: mapToLegacySettlementType(
              editForm.collection_method,
              editForm.billing_cycle,
              editForm.direct_collection_point
            ),
          }
        : {}),
      selected_options: {
        톤수: editForm.vehicle_type,
        차량형태: editForm.차량형태,
        상차조건: editForm.상차조건,
        하차조건: editForm.하차조건,
        물품특성: editForm.물품특성,
        운송시간: editForm.운송시간,
        "왕복/편도": editForm["왕복/편도"],
        대기시간_분: Number(editForm.waitingMinutes) || 0,
        경유지수: Number(editForm.waypointCount) || 0,
        // 🔴 16차에 첫거래지원 할인을 화면·계산에서 걷어냈지만 이 줄은 남긴다.
        // 견적 상세 수정은 `selected_options` 전체를 새 객체로 교체하므로, 이 줄을 빼면
        // 그 견적을 한 번 수정하는 것만으로 **과거에 기록된 동의 값이 사라진다.**
        // 지시서가 "기존 키를 손대지 말 것"이라고 한 것이 이 경우다(원칙 32번과 같은 결).
        // 신규 등록(`/admin/quotes`)은 이 키를 더 이상 쓰지 않는다.
        첫거래지원할인: (quote.selected_options as any)?.첫거래지원할인 || false,
      },
      updated_by: await getCurrentStaffId(),
      /* ── 「수정견적」 신호 ──────────────────────────────────────────────────
         🔴 **`updated_at` 으로 대신하지 말 것** — 메모 한 줄에도 움직인다(PR #164).
         🔴 **`수주` 인 견적의 금액이 실제로 바뀐 때만** 찍는다(`lib/quoteRevision.ts`).
         ⚠️ 한 번 찍힌 값은 **다시 지우지 않는다** — 되돌려 적어도 「조정이 있었다」는
            사실은 남는다. 배지는 운송이 끝나면 저절로 사라진다. */
      ...(isQuoteRevision({
        status: quote.status,
        beforeAmount: quote.final_amount,
        afterAmount: nextAmount,
      })
        ? { revised_at: new Date().toISOString() }
        : {}),
    };

    /* 🔴 **수정 이력은 payload 를 만든 뒤, 저장 전에 미리 뽑는다** — 저장이 끝나면
       `load()` 가 `quote` 를 새 값으로 갈아치워 「전」을 알 수 없게 된다. */
    const changes = diffRecordFields("quotes", quote, payload);
    const staffName = await getCurrentStaffName();

    if (force) {
      const { error } = await supabase.from("quotes").update(payload).eq("id", id);
      if (error) {
        setSaving(false);
        setSaveError(error.message);
        return;
      }
      await applyAmountToOrders(amountTargets, nextAmount, payload.updated_by, staffName);
      await writeChangeLog(changes, payload.updated_by, staffName);
      setSaving(false);
      setEditing(false);
      setReviseAmount(false);
      load();
      return;
    }

    const { conflict: hasConflict, error } = await optimisticUpdate(
      "quotes",
      id,
      payload,
      quote.updated_at
    );
    if (error) {
      setSaving(false);
      setSaveError(error);
      return;
    }
    if (hasConflict) {
      setSaving(false);
      setConflict(true);
      return;
    }
    // 🔴 **견적이 실제로 저장된 뒤에만** 오더를 고친다 — 충돌로 막힌 저장에서 오더만
    //    바뀌면 두 화면의 금액이 갈린다.
    await applyAmountToOrders(amountTargets, nextAmount, payload.updated_by, staffName);
    await writeChangeLog(changes, payload.updated_by, staffName);
    setSaving(false);
    setEditing(false);
    setReviseAmount(false);
    load();
  }

  /**
   * 🔴 **저장이 성공한 뒤에만 부른다.** 실패해도 저장을 되돌리지 않지만 **조용히
   *    넘어가지도 않는다**(원칙 55번) — 안 그러면 「이력이 왜 비어 있지」를 화면에서
   *    알 길이 없다.
   */
  async function writeChangeLog(
    changes: Parameters<typeof logRecordChange>[1]["changes"],
    staffId: string | null,
    staffName: string | null
  ) {
    const { logged, error } = await logRecordChange(supabase, {
      target: "quotes",
      recordId: id,
      staffId,
      staffName,
      changes,
    });
    if (error) {
      setSaveError(`견적은 저장했지만 수정 이력을 남기지 못했습니다: ${error}`);
      return;
    }
    if (logged) setChangeLogKey((k) => k + 1);
  }

  /**
   * 🔴 **견적 저장이 성공한 뒤에만 부른다.** 실패해도 견적 저장을 되돌리지 않는다 —
   *    견적은 이미 저장됐고, 오더 금액은 오더 화면에서 고칠 수 있다. 다만 **조용히
   *    넘어가지 않는다**(원칙 55번).
   */
  async function applyAmountToOrders(
    targets: LinkedOrder[],
    amount: number | null,
    staffId: string | null,
    staffName: string | null
  ) {
    setAmountSyncNotice(null);
    if (amount == null || targets.length === 0) return;
    const { error, logError } = await syncQuoteAmountToOrders(
      supabase,
      targets,
      amount,
      staffId,
      staffName
    );
    if (error) {
      setSaveError(`견적은 저장했지만 연결된 오더 금액 반영에 실패했습니다: ${error}`);
      return;
    }
    // 🔴 금액은 반영됐는데 이력만 실패한 경우 — 조용히 넘어가지 않는다(원칙 55번).
    if (logError) {
      setSaveError(`오더 금액은 반영했지만 그 오더의 수정 이력을 남기지 못했습니다: ${logError}`);
    }
    setAmountSyncNotice(
      `연결된 운송오더 ${targets
        .map((o) => o.order_no || o.id)
        .join(", ")} 의 화주 청구금액도 ${amount.toLocaleString()}원(부가세 별도)으로 함께 수정했습니다. ` +
        `배차의 화주 청구금액과 이미 만들어진 정산 건은 따로 확인해주세요.`
    );
  }

  async function handleDelete() {
    if (!quote) return;
    const confirmed = window.confirm(
      `견적 "${quote.quote_no}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;
    setDeleting(true);
    const res = await fetch("/api/admin/delete-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "quotes", id }),
    });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "삭제에 실패했습니다.");
      return;
    }
    router.push("/admin/quotes");
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !quote) {
    return (
      <main className="container">
        <div className="error-box">견적 정보를 불러오지 못했습니다. {error}</div>
        <Link href="/admin/quotes" className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  const statusColor = STATUS_COLORS[quote.status] || {
    bg: "#F3F4F6",
    text: "#6B7280",
  };

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/quotes"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          ← 견적 목록으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{quote.quote_no}</h1>
          <p className="page-desc">
            {quote.companies?.name || quote.guest_name}
            {!quote.companies && quote.guest_name && (
              <span className="badge" style={{ marginLeft: 8 }}>
                개인/신규
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!editing && (
            <button
              className="btn btn-ghost"
              onClick={() => setEditing(true)}
              style={{ padding: "9px 16px", borderRadius: "var(--radius)", fontSize: 13.5, cursor: "pointer" }}
            >
              수정
            </button>
          )}
          {isAdmin && (
            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: "9px 16px",
                borderRadius: "var(--radius)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}
      {saveError && <div className="error-box">오류: {saveError}</div>}
      {/* 🔴 조회가 실패하면 **금액을 고쳐도 오더가 안 따라간다** — 그 사실을 말한다. */}
      {linkedOrdersError && (
        <div className="error-box">
          연결된 운송오더를 불러오지 못했습니다(금액이 오더에 반영되지 않습니다): {linkedOrdersError}
        </div>
      )}
      {/* 🔴 **무엇이 같이 바뀌었는지 말한다** — 돈이라 조용히 지나가면 안 된다. */}
      {amountSyncNotice && (
        <div
          className="card"
          style={{ padding: "10px 14px", marginBottom: 20, fontSize: 12.5, color: "var(--text-muted)" }}
          role="status"
        >
          {amountSyncNotice}
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
            진행 상태
          </div>
          <select
            value={quote.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: 999,
              border: "none",
              background: statusColor.bg,
              color: statusColor.text,
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {quoteStatusAdminLabel(s)}
              </option>
            ))}
          </select>
          {/* 🔴 **이미 오더가 있으면 「생성」을 먼저 내놓지 않는다**(사용자 지시 2026-09-17:
              *「수정 견적은 한번 수주로 된 견적이고 이미 운송오더가 만들어져 있는 상황이라
              견적 상세에서 "운송오더 생성" 버튼이 있으면 안될것 같다」*). 그 자리에
              **「해당 운송오더 이동」**을 놓고, 「추가 운송오더 생성」은 그 옆에 둔다.
              🔴 **「추가 생성」을 없애지 말 것** — 한 견적을 여러 차수로 나눠 싣는 경우가
                 있고, 지우면 그때 오더를 만들 길이 사라진다(실측: 지금 오더 2건 이상인
                 견적은 0건이라 아직 쓰인 적 없는 경로다).
              🔴 **조회 실패(`linkedOrdersError`)면 「생성」만 내놓는다** — 오더가 없는
                 것과 못 읽은 것을 구분할 수 없으니, 없던 동작으로 되돌아가는 쪽이 안전하다.
                 그 사실은 바로 위 빨간 줄이 이미 말하고 있다. */}
          {quote.status === "수주" && (
            <span style={{ marginLeft: 12, display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
              {hasOrder && !linkedOrdersError ? (
                <>
                  {linkedOrders.map((o) => (
                    <button
                      key={o.id}
                      className="btn"
                      style={{ fontSize: 12.5, padding: "6px 12px" }}
                      onClick={() => router.push(`/admin/orders/${o.id}`)}
                    >
                      {linkedOrders.length > 1
                        ? `${o.order_no || "운송오더"} 이동`
                        : "해당 운송오더 이동"}
                    </button>
                  ))}
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12.5, padding: "6px 12px" }}
                    onClick={() => router.push(`/admin/orders?from_quote=${quote.id}`)}
                  >
                    + 추가 운송오더 생성
                  </button>
                </>
              ) : (
                <button
                  className="btn"
                  style={{ fontSize: 12.5, padding: "6px 12px" }}
                  onClick={() => router.push(`/admin/orders?from_quote=${quote.id}`)}
                >
                  + 운송오더 생성
                </button>
              )}
            </span>
          )}
          {/* 🔴 화주가 포털에서 직접 승인한 건임을 표시한다(2026-08-29). 이 줄이 없으면
              담당자가 손으로 `수주` 로 바꾼 건과 구분되지 않는다 — 28차 §5-1 이 찾아낸
              것이고, 그래서 `quotes` 에 컬럼 2개를 만들었다.
              ⚠️ 과거 건은 전부 null 이라 이 줄이 없는 것이 정상이다(소급 기록 금지). */}
          {formatCustomerApprovedAt(quote.approved_by_customer_at) && (
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
              {CUSTOMER_APPROVED_LABEL} ·{" "}
              <span className="num">
                {formatCustomerApprovedAt(quote.approved_by_customer_at)}
              </span>
            </div>
          )}
        </div>

        {!editing ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>구간</div>
                <div style={{ fontSize: 13.5 }}>
                  {quote.origin || "-"} → {quote.destination || "-"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>거리</div>
                <div style={{ fontSize: 13.5 }}>
                  {quote.distance_km ? `${quote.distance_km}km` : "-"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>톤수</div>
                <div style={{ fontSize: 13.5 }}>{quote.vehicle_type || "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>품목</div>
                <div style={{ fontSize: 13.5 }}>{quote.item || "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>정산방식</div>
                <div style={{ fontSize: 13.5 }}>
                  {getSettlementDisplayLabel(quote.collection_method, quote.billing_cycle)}
                  {getPaymentConditionLabel(quote.direct_collection_point) && (
                    <> · {getPaymentConditionLabel(quote.direct_collection_point)}</>
                  )}
                </div>
              </div>
              {quote.guest_phone && (
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    연락처
                  </div>
                  <div style={{ fontSize: 13.5 }}>{quote.guest_phone}</div>
                </div>
              )}
              {quote.companies && (
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    화주 상세
                  </div>
                  <Link
                    href={`/admin/companies/${quote.companies.id}`}
                    style={{ fontSize: 13.5, textDecoration: "underline" }}
                  >
                    {quote.companies.name} 페이지로 이동 →
                  </Link>
                </div>
              )}
            </div>

            {(quote.origin_contact_phone || quote.destination_contact_phone) && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>상차지 담당자</div>
                  <div style={{ fontSize: 13.5 }}>
                    {[quote.origin_company_name, quote.origin_contact_name, quote.origin_contact_phone]
                      .filter(Boolean)
                      .join(" · ") || "-"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>하차지 담당자</div>
                  <div style={{ fontSize: 13.5 }}>
                    {[quote.destination_company_name, quote.destination_contact_name, quote.destination_contact_phone]
                      .filter(Boolean)
                      .join(" · ") || "-"}
                  </div>
                </div>
              </div>
            )}

            {(formatDateTime(quote.requested_pickup_at) || formatDateTime(quote.requested_dropoff_at)) && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>희망 상차일시</div>
                  <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>
                    {formatDateTime(quote.requested_pickup_at) || "-"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>희망 하차일시</div>
                  <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>
                    {formatDateTime(quote.requested_dropoff_at) || "-"}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <form
            onKeyDown={handleFormKeyDown}
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="form-grid"
            style={{ padding: 0 }}
          >
            <AddressSearch
              label="출발지"
              value={editForm.origin}
              detailValue={editForm.originDetail}
              detailPlaceholder="추가 상세주소 (선택)"
              onChange={(addr, sido, sigungu) =>
                setEditForm({ ...editForm, origin: addr, originSido: sido, originSigungu: sigungu })
              }
              onDetailChange={(v) => setEditForm({ ...editForm, originDetail: v })}
            />
            <AddressSearch
              label="도착지"
              value={editForm.destination}
              detailValue={editForm.destinationDetail}
              detailPlaceholder="추가 상세주소 (선택)"
              onChange={(addr, sido, sigungu) =>
                setEditForm({ ...editForm, destination: addr, destinationSido: sido, destinationSigungu: sigungu })
              }
              onDetailChange={(v) => setEditForm({ ...editForm, destinationDetail: v })}
            />
            <PickupDropoffContactFields
              value={editForm}
              onChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
            />
            <div className="field">
              <label>거리(km)</label>
              <input
                type="number"
                value={editForm.distance_km}
                onChange={(e) => setEditForm({ ...editForm, distance_km: e.target.value })}
              />
            </div>
            <div className="field">
              <label>톤수</label>
              <select
                value={editForm.vehicle_type}
                onChange={(e) => setEditForm({ ...editForm, vehicle_type: e.target.value })}
              >
                {VEHICLE_TYPES_ALL.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>차량형태</label>
              <select
                value={editForm.차량형태}
                onChange={(e) => setEditForm({ ...editForm, 차량형태: e.target.value })}
              >
                {orderBodyTypes(
                  surcharges.filter((s) => s.category === "차량형태").map((s) => s.option_name)
                ).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>물품특성</label>
              <select
                value={editForm.물품특성}
                onChange={(e) => setEditForm({ ...editForm, 물품특성: e.target.value })}
              >
                {surcharges
                  .filter((s) => s.category === "물품특성")
                  .map((o) => (
                    <option key={o.option_name} value={o.option_name}>
                      {o.option_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>품목</label>
              <input
                value={editForm.item}
                onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <DateTimePicker
                defaultTimeMode="now"
                label="희망 상차 일시"
                value={editForm.requested_pickup_at}
                onChange={(v) => setEditForm({ ...editForm, requested_pickup_at: v })}
                nowChip
                nowSelected={pickupNow}
                onNowChange={setPickupNow}
              />
              {pickupNow && (
                <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--text-muted)" }}>
                  저장하는 순간의 시각으로 기록됩니다
                </div>
              )}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <DateTimePicker
                defaultTimeMode="now"
                label="희망 하차 일시"
                value={editForm.requested_dropoff_at}
                onChange={(v) => setEditForm({ ...editForm, requested_dropoff_at: v })}
                minDateTime={dropoffArrivalType ? undefined : minDropoffDateTime}
                minDateTimeLabel={dropoffArrivalType ? undefined : minDropoffLabel}
                arrivalChips
                arrivalValue={dropoffArrivalType as any}
                onArrivalChange={(v) => setDropoffArrivalType(v)}
                pickupDate={
                  (editForm.requested_pickup_at || "").split("T")[0] || undefined
                }
              />
              {arrivalTypeLabel(dropoffArrivalType) && (
                <div style={{ marginTop: 6 }}>
                  <span className="badge">
                    {arrivalTypeLabel(dropoffArrivalType)} · {ARRIVAL_TIME_FREE_NOTE}
                  </span>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                    특이사항에 한 줄로 기록됩니다
                  </div>
                </div>
              )}
            </div>
            <div className="field">
              <label>운송시간</label>
              <select
                value={editForm.운송시간}
                onChange={(e) => setEditForm({ ...editForm, 운송시간: e.target.value })}
              >
                {surcharges
                  .filter((s) => s.category === "운송시간")
                  .map((o) => (
                    <option key={o.option_name} value={o.option_name}>
                      {o.option_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>왕복/편도</label>
              <select
                value={editForm["왕복/편도"]}
                onChange={(e) => setEditForm({ ...editForm, "왕복/편도": e.target.value })}
              >
                {surcharges
                  .filter((s) => s.category === "왕복/편도")
                  .map((o) => (
                    <option key={o.option_name} value={o.option_name}>
                      {o.option_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>상차조건</label>
              <select
                value={editForm.상차조건}
                onChange={(e) => setEditForm({ ...editForm, 상차조건: e.target.value })}
              >
                {LOADING_METHOD_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>하차조건</label>
              <select
                value={editForm.하차조건}
                onChange={(e) => setEditForm({ ...editForm, 하차조건: e.target.value })}
              >
                {LOADING_METHOD_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>대기시간(분)</label>
              <input
                type="number"
                value={editForm.waitingMinutes}
                onChange={(e) => setEditForm({ ...editForm, waitingMinutes: e.target.value })}
              />
            </div>
            <div className="field">
              <label>경유지 수</label>
              <input
                type="number"
                value={editForm.waypointCount}
                onChange={(e) => setEditForm({ ...editForm, waypointCount: e.target.value })}
              />
            </div>

            <CollectionMethodInput
              namePrefix="quote_edit"
              /* 🔴 36차 — 계약과 다르면 알린다(막지 않는다). */
              contractBillingCycle={(quote as any)?.companies?.billing_cycle_default}
              value={{
                collection_method: editForm.collection_method,
                billing_cycle: editForm.billing_cycle,
                direct_collection_point: editForm.direct_collection_point,
              }}
              onChange={(next) =>
                setEditForm({
                  ...editForm,
                  collection_method: next.collection_method,
                  billing_cycle: next.billing_cycle,
                  direct_collection_point: next.direct_collection_point,
                })
              }
            />
            {hasOrder && (
              <p style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--text-muted)", margin: "-6px 0 0" }}>
                이 견적은 이미 오더로 전환되었습니다. <strong>정산방식</strong>을 수정해도 기존
                오더에는 자동 반영되지 않습니다(최종 견적금액은 함께 반영됩니다).
              </p>
            )}

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>적재구분</label>
              <div style={{ display: "flex", flexWrap: "nowrap", gap: 16, fontSize: 13 }}>
                <label style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  <input
                    type="radio"
                    name="quote_edit_loading_type"
                    style={CHECKBOX_STYLE}
                    checked={editForm.loading_type === "exclusive"}
                    onChange={() => setEditForm({ ...editForm, loading_type: "exclusive" })}
                  />
                  독차
                </label>
                <label style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  <input
                    type="radio"
                    name="quote_edit_loading_type"
                    style={CHECKBOX_STYLE}
                    checked={editForm.loading_type === "mixable"}
                    onChange={() => setEditForm({ ...editForm, loading_type: "mixable" })}
                  />
                  혼적가능
                </label>
              </div>

              {editForm.loading_type === "mixable" && (
                <div style={{ marginTop: 10, padding: 12, background: "var(--bg)", borderRadius: 8 }}>
                  <label
                    style={{
                      display: "flex",
                      flexWrap: "nowrap",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      marginBottom: 10,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="checkbox"
                      style={CHECKBOX_STYLE}
                      checked={editForm.mixed_shipper_consent}
                      onChange={(e) => setEditForm({ ...editForm, mixed_shipper_consent: e.target.checked })}
                    />
                    화주 동의 확인됨
                  </label>

                  <div style={{ display: "flex", flexWrap: "nowrap", gap: 16, fontSize: 13, marginBottom: 10 }}>
                    <label
                      style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                    >
                      <input
                        type="radio"
                        name="quote_edit_mixed_discount_type"
                        style={CHECKBOX_STYLE}
                        checked={editForm.mixed_discount_type === "percent"}
                        onChange={() =>
                          setEditForm((f) => ({
                            ...f,
                            mixed_discount_type: "percent",
                            mixed_discount_percent:
                              f.mixed_discount_percent ||
                              (mixedDiscountTier
                                ? String(mixedDiscountTier.standard_discount_percent)
                                : ""),
                          }))
                        }
                      />
                      할인율(%)
                    </label>
                    <label
                      style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                    >
                      <input
                        type="radio"
                        name="quote_edit_mixed_discount_type"
                        style={CHECKBOX_STYLE}
                        checked={editForm.mixed_discount_type === "amount"}
                        onChange={() => setEditForm({ ...editForm, mixed_discount_type: "amount" })}
                      />
                      할인금액(원)
                    </label>
                  </div>

                  {editForm.mixed_discount_type === "percent" && (
                    <div className="field" style={{ maxWidth: 240, marginBottom: 10 }}>
                      <label>혼적 할인율(%)</label>
                      <input
                        type="number"
                        step={0.1}
                        value={editForm.mixed_discount_percent}
                        onChange={(e) => setEditForm({ ...editForm, mixed_discount_percent: e.target.value })}
                      />
                      <MixedDiscountStandardHint
                        tier={mixedDiscountTier}
                        currentValue={editForm.mixed_discount_percent}
                      />
                    </div>
                  )}
                  {editForm.mixed_discount_type === "amount" && (
                    <div className="field" style={{ maxWidth: 200, marginBottom: 10 }}>
                      <label>혼적 할인금액(원)</label>
                      <MoneyInput
                        value={editForm.mixed_discount_amount}
                        onChange={(v) => setEditForm({ ...editForm, mixed_discount_amount: v })}
                      />
                    </div>
                  )}

                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>혼적 주의사항</label>
                    <textarea
                      rows={2}
                      value={editForm.mixed_note}
                      onChange={(e) => setEditForm({ ...editForm, mixed_note: e.target.value })}
                      placeholder="예: 파손주의 화물 별도 적재, 냉동/냉장 화물과 혼적 불가, 위험물 동승 불가 등"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>특이사항</label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>

            {/* 🔴 배차 취소(운임료 조정 필요)에서 넘어오면 **옅은 빨강으로 강조**한다
                (사용자 지시 2026-09-17). 🔴 **강한 빨강을 쓰지 말 것** — 오류가 아니라
                「여기를 고쳐 달라」는 안내다. 값은 이 저장소가 이미 쓰는 쌍이다
                (`#FDF3F2` / `#B4423A` — 취소·반려 배지와 같은 색). */}
            <div
              className="field"
              style={
                reviseAmount
                  ? {
                      background: "#FDF3F2",
                      border: "1px solid #F0C9C5",
                      borderRadius: 10,
                      padding: 12,
                      margin: -4,
                    }
                  : undefined
              }
            >
              <label style={reviseAmount ? { color: "#B4423A", fontWeight: 700 } : undefined}>
                최종 견적금액(원)
              </label>
              <MoneyInput
                value={editForm.final_amount}
                onChange={(v) => setEditForm({ ...editForm, final_amount: v })}
              />
              {reviseAmount && (
                <p style={{ fontSize: 11.5, color: "#B4423A", marginTop: 6, marginBottom: 0, fontWeight: 600 }}>
                  {QUOTE_REVISE_AMOUNT_NOTICE}
                </p>
              )}
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
                기본운임·가산 내역은 자동 재계산되지 않습니다. 필요하면 최종금액을 직접 조정해주세요.
              </p>
              {/* 🔴 **금액은 오더로 따라간다**(2026-09-17) — 바로 위 정산방식 안내가
                  「자동 반영되지 않습니다」라고 말하므로, 여기서 갈라 주지 않으면
                  담당자가 금액도 안 넘어가는 줄 안다. */}
              {hasOrder && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
                  저장하면 연결된 운송오더의 화주 청구금액(부가세 별도)도 이 금액으로 함께
                  바뀝니다. 배차·정산 금액은 따로 확인해주세요.
                </p>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 4 }}>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                  load();
                }}
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>

      {conflict && (
        <ConflictWarning
          onReload={() => {
            setConflict(false);
            load();
          }}
          onForceSave={() => handleSave(true)}
          saving={saving}
        />
      )}

      {!editing && quote.selected_options && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
            견적 조건
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 10,
            }}
          >
            {Object.entries(quote.selected_options).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  {k.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: 13.5 }}>
                  {typeof v === "boolean" ? (v ? "적용" : "-") : String(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!editing && quote.loading_type === "mixable" && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
            혼적 옵션 <span className="badge" style={{ marginLeft: 6 }}>혼적가능</span>
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>화주 동의</div>
              <div style={{ fontSize: 13.5 }}>{quote.mixed_shipper_consent ? "확인됨" : "미확인"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>할인방식</div>
              <div style={{ fontSize: 13.5 }}>
                {quote.mixed_discount_type === "percent"
                  ? `할인율 ${quote.mixed_discount_percent}%`
                  : quote.mixed_discount_type === "amount"
                  ? `할인금액 ${won(quote.mixed_discount_amount)}`
                  : "-"}
              </div>
            </div>
          </div>
          {quote.mixed_note && (
            <p style={{ fontSize: 13, whiteSpace: "pre-wrap", marginTop: 12, marginBottom: 0 }}>
              {quote.mixed_note}
            </p>
          )}
        </div>
      )}

      {!editing && quote.notes && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 10 }}>특이사항</h3>
          <p style={{ fontSize: 13.5, whiteSpace: "pre-wrap", margin: 0 }}>{quote.notes}</p>
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          견적 계산 내역
        </h3>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 13.5,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>기본운임</span>
          <span className="num">{won(quote.base_fare)}</span>
        </div>
        {items.map((it) => (
          <div
            key={it.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
              fontSize: 12.5,
              color: "var(--text-muted)",
            }}
          >
            <span>{(it.amount || 0) < 0 ? "-" : "+"} {it.item_name}</span>
            <span className="num">{won(it.amount != null ? Math.abs(it.amount) : it.amount)}</span>
          </div>
        ))}
        {/* 🔴 「조정」 — 담당자가 최종금액을 직접 고쳤을 때 항목 합과의 차이를 그린다(36차 E장).
            0이면 그리지 않으므로 조정 없는 견적은 종전과 한 글자도 같다.
            🔴 값은 `lib/quoteAdjustment.ts` 하나가 정한다 — 네 산출물이 같아야 한다. */}
        {shouldShowAdjustment(quoteAdjustment) && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
              fontSize: 12.5,
              color: "var(--text-muted)",
            }}
          >
            <span>{QUOTE_ADJUSTMENT_LABEL}</span>
            <span className="num">{formatAdjustment(quoteAdjustment, (n) => won(n) || "")}</span>
          </div>
        )}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            marginTop: 10,
            paddingTop: 10,
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
            fontSize: 17,
          }}
        >
          <span>최종 견적금액</span>
          <span className="num">{won(quote.final_amount)}</span>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
          부가세 별도
          {wonVatIncluded(quote.final_amount) && (
            <> (부가세 포함 {wonVatIncluded(quote.final_amount)})</>
          )}
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 6 }}>
          견적서 출력
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
          화주에게 전달할 정식 견적서를 <strong>이 화면 위에 띄워</strong> 인쇄하거나
          PDF로 저장할 수 있습니다. (화주포털을 통한 공유 기능은 추후 추가될 예정입니다.)
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* 🔴 **새 탭으로 열지 않는다**(34차 지적 3번) — 화면을 떠났다가 탭을 닫고
              돌아오면 하던 일이 끊긴다. 모달 안 `iframe` 이 **같은 print 라우트**를
              띄우므로 견적서 내용은 여전히 한 곳에만 있다.
              🟢 프레임 인쇄가 막히는 브라우저를 위한 「새 탭으로 열기」는 모달 안에 있다. */}
          <button className="btn" onClick={() => setPrintOpen(true)}>
            견적서 출력 (PDF)
          </button>
          {/* 화주가 "엑셀로 보내달라"고 요청하는 경우가 있어 관리자 쪽에도 같이 둠.
              운송관리 화면과 동일한 함수를 쓰므로 두 곳에서 받은 파일 내용이 같음 */}
          <button className="btn btn-ghost" disabled={excelBusy} onClick={handleQuoteExcel}>
            {excelBusy ? "생성 중..." : "견적서 출력 (Excel)"}
          </button>
          <button className="btn btn-ghost" onClick={handleSendQuoteSms} disabled={sendingQuoteSms}>
            {sendingQuoteSms ? "발송 중..." : quoteSmsSent ? "문자 발송 완료 ✓" : "문자로 요약 발송"}
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
          차량/운임/상차일만 요약해서 문자로 보냅니다(상세 견적서는 화주포털 안내).
        </p>
        {quoteSmsError && <div className="error-box" style={{ marginTop: 8 }}>{quoteSmsError}</div>}
      </div>

      {/* 🔴 **문자 이력 바로 위**에 둔다 — 둘 다 「되짚어 보는 기록」이라 같이 모아야
          담당자가 한 자리에서 본다. 🔴 기본 접힘이다(상세가 이미 길다). */}
      <RecordChangeLogPanel target="quotes" recordId={quote.id} refreshKey={changeLogKey} />

      <SmsLogPanel relatedType="quote" relatedId={quote.id} />

      {smsPreview && (
        <SmsConfirmModal
          preview={smsPreview}
          onSent={() => {
            setSmsPreview(null);
            setQuoteSmsSent(true);
          }}
          onSkip={() => setSmsPreview(null)}
        />
      )}

      <ProcessedByFooter
        createdBy={quote.created_by}
        createdAt={quote.created_at}
        updatedBy={quote.updated_by}
        updatedAt={quote.updated_at}
      />

      {printOpen && (
        <PrintModal
          src={`/admin/quotes/${quote.id}/print`}
          title={`견적서 ${quote.quote_no || ""}`.trim()}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </main>
  );
}
