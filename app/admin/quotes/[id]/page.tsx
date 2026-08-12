"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { STATUS_OPTIONS as COMPANY_STATUS_ORDER } from "@/lib/statusColors";
import { getCurrentStaffId, getCurrentStaffRole } from "@/lib/currentStaff";
import { LOADING_METHOD_OPTIONS } from "@/lib/loadingMethods";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { calcInclusiveAmount } from "@/lib/vat";
import { optimisticUpdate } from "@/lib/optimisticUpdate";
import {
  getLatestMixedLoadingDiscountSettings,
  DEFAULT_MIXED_LOADING_DISCOUNT_SETTINGS,
} from "@/lib/mixedLoadingDiscountSettings";
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
import CollectionMethodInput, { CollectionMethodValue } from "@/components/CollectionMethodInput";
import { getSettlementDisplayLabel, getPaymentConditionLabel, mapToLegacySettlementType } from "@/lib/settlementLabels";

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

// 견적 관리는 거리기반 최소 간격(100km당 1h, 2~5h 범위) 규칙을 씀 (원칙 6번)
function calcMinGapHours(distanceKm: number) {
  return Math.min(5, Math.max(2, 2 + Math.floor(distanceKm / 100)));
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
  const [standardMixedDiscountPercent, setStandardMixedDiscountPercent] = useState(0);
  const [hasOrder, setHasOrder] = useState(false);
  const [sendingQuoteSms, setSendingQuoteSms] = useState(false);
  const [quoteSmsSent, setQuoteSmsSent] = useState(false);
  const [quoteSmsError, setQuoteSmsError] = useState<string | null>(null);
  const [smsPreview, setSmsPreview] = useState<SmsPreview | null>(null);

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
  const nowDateTime = useMemo(() => toLocalDateTimeInput(new Date().toISOString()), []);

  // 거리 기준 최소 하차일시 (희망 상차일시가 있어야 계산됨)
  const minDropoffDateTime = useMemo(() => {
    if (!editForm.requested_pickup_at) return undefined;
    const gapHours = calcMinGapHours(Number(editForm.distance_km) || 0);
    const pickup = new Date(editForm.requested_pickup_at);
    pickup.setHours(pickup.getHours() + gapHours);
    return toLocalDateTimeInput(pickup.toISOString());
  }, [editForm.requested_pickup_at, editForm.distance_km]);

  const minDropoffLabel = editForm.requested_pickup_at
    ? `거리 기준 상차 후 최소 ${calcMinGapHours(Number(editForm.distance_km) || 0)}시간 이후로 선택해주세요`
    : undefined;

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
    getLatestMixedLoadingDiscountSettings().then((row) => {
      if (row) setStandardMixedDiscountPercent(row.standard_discount_percent);
    });
    supabase
      .from("rate_surcharges")
      .select("category,option_name")
      .then(({ data }) => setSurcharges((data as Surcharge[]) || []));
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("*, companies(id,name,phone)")
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

    const { count: orderCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", id);
    setHasOrder((orderCount || 0) > 0);

    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(status: string) {
    const staffId = await getCurrentStaffId();
    const { error } = await supabase
      .from("quotes")
      .update({ status, updated_by: staffId })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setQuote((q) => (q ? { ...q, status } : q));

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

    if (
      editForm.requested_pickup_at &&
      new Date(editForm.requested_pickup_at).getTime() < Date.now() - 60000
    ) {
      setSaveError("희망 상차일시는 현재 시각 이후로 설정해주세요.");
      return;
    }
    if (editForm.requested_pickup_at && editForm.requested_dropoff_at) {
      const gapHours = calcMinGapHours(Number(editForm.distance_km) || 0);
      const diffMs =
        new Date(editForm.requested_dropoff_at).getTime() -
        new Date(editForm.requested_pickup_at).getTime();
      if (diffMs < gapHours * 60 * 60 * 1000) {
        setSaveError(`희망 하차일시는 상차일시 기준 최소 ${gapHours}시간 이후로 설정해주세요.`);
        return;
      }
    }

    if (!editForm.origin_contact_phone.trim()) {
      setSaveError("상차지 담당자 연락처를 입력해주세요.");
      return;
    }
    if (!editForm.destination_contact_phone.trim()) {
      setSaveError("하차지 담당자 연락처를 입력해주세요.");
      return;
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
      requested_pickup_at: localInputToISOString(editForm.requested_pickup_at),
      requested_dropoff_at: localInputToISOString(editForm.requested_dropoff_at),
      notes: editForm.notes || null,
      final_amount: Number(editForm.final_amount) || null,
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
        첫거래지원할인: (quote.selected_options as any)?.첫거래지원할인 || false,
      },
      updated_by: await getCurrentStaffId(),
    };

    if (force) {
      const { error } = await supabase.from("quotes").update(payload).eq("id", id);
      setSaving(false);
      if (error) {
        setSaveError(error.message);
        return;
      }
      setEditing(false);
      load();
      return;
    }

    const { conflict: hasConflict, error } = await optimisticUpdate(
      "quotes",
      id,
      payload,
      quote.updated_at
    );
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    if (hasConflict) {
      setConflict(true);
      return;
    }
    setEditing(false);
    load();
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
                {s}
              </option>
            ))}
          </select>
          {quote.status === "수주" && (
            <button
              className="btn"
              style={{ marginLeft: 12, fontSize: 12.5, padding: "6px 12px" }}
              onClick={() =>
                router.push(`/admin/orders?from_quote=${quote.id}`)
              }
            >
              + 운송오더 생성
            </button>
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
                {["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "5톤 플러스/축"].map((v) => (
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
                {surcharges
                  .filter((s) => s.category === "차량형태")
                  .map((o) => (
                    <option key={o.option_name} value={o.option_name}>
                      {o.option_name}
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
                label="희망 상차 일시"
                value={editForm.requested_pickup_at}
                onChange={(v) => setEditForm({ ...editForm, requested_pickup_at: v })}
                minDateTime={nowDateTime}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <DateTimePicker
                label="희망 하차 일시"
                value={editForm.requested_dropoff_at}
                onChange={(v) => setEditForm({ ...editForm, requested_dropoff_at: v })}
                minDateTime={minDropoffDateTime}
                minDateTimeLabel={minDropoffLabel}
              />
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
                이 견적은 이미 오더로 전환되었습니다. 정산방식을 수정해도 기존 오더에는 자동 반영되지 않습니다.
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
                              f.mixed_discount_percent || String(standardMixedDiscountPercent),
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
                    <div className="field" style={{ maxWidth: 160, marginBottom: 10 }}>
                      <label>혼적 할인율(%)</label>
                      <input
                        type="number"
                        step={0.1}
                        value={editForm.mixed_discount_percent}
                        onChange={(e) => setEditForm({ ...editForm, mixed_discount_percent: e.target.value })}
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

            <div className="field">
              <label>최종 견적금액(원)</label>
              <MoneyInput
                value={editForm.final_amount}
                onChange={(v) => setEditForm({ ...editForm, final_amount: v })}
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
                기본운임·가산 내역은 자동 재계산되지 않습니다. 필요하면 최종금액을 직접 조정해주세요.
              </p>
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
          화주에게 전달할 정식 견적서를 새 탭에서 열어 인쇄하거나 PDF로 저장할 수
          있습니다. (화주포털을 통한 공유 기능은 추후 추가될 예정입니다.)
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            className="btn"
            onClick={() => window.open(`/admin/quotes/${quote.id}/print`, "_blank")}
          >
            견적서 출력 (PDF)
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
    </main>
  );
}
