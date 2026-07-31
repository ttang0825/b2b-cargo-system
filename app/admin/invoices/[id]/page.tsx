"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  INVOICE_STATUS_OPTIONS,
  getInvoiceStatusColor,
} from "@/lib/invoiceStatusColors";
import { getCurrentStaffRole } from "@/lib/currentStaff";
import ProcessedByFooter from "@/components/ProcessedByFooter";
import ConflictWarning from "@/components/ConflictWarning";
import SettlementFieldsChangeModal from "@/components/SettlementFieldsChangeModal";
import CollectionMethodInput, { CollectionMethodValue } from "@/components/CollectionMethodInput";
import { logSettlementFieldChange } from "@/lib/settlementFieldChangeLog";
import {
  getSettlementDisplayLabel,
  getPaymentConditionLabel,
  getBrokerageFeePayerLabel,
  mapToLegacySettlementType,
} from "@/lib/settlementLabels";
import { calcVatAmount, calcInclusiveAmount } from "@/lib/vat";
import MixableBadge from "@/components/MixableBadge";
import LockedBadge from "@/components/LockedBadge";
import AmendmentReasonModal from "@/components/AmendmentReasonModal";

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [settlementSaving, setSettlementSaving] = useState(false);
  const [amendmentReasonOpen, setAmendmentReasonOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // 차주 지급금액이 배차 상세 계산기를 거친 값인지 — 목록과 동일한 판단 기준
  const [driverCalcInfo, setDriverCalcInfo] = useState<{ throughCalc: boolean; insuranceApplied: boolean } | null>(
    null
  );

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  const [editForm, setEditForm] = useState({
    status: "정산대기",
    tax_invoice_issued: false,
    tax_invoice_date: "",
    payment_received: false,
    payment_received_date: "",
    driver_paid: false,
    driver_paid_date: "",
    brokerage_fee_paid: false,
    brokerage_fee_paid_at: "",
  });
  const [settlementValue, setSettlementValue] = useState<CollectionMethodValue>({
    collection_method: "broker",
    billing_cycle: "per_order",
    direct_collection_point: null,
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*, orders(id,order_no,guest_name,loading_type), companies(id,name)")
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setInvoice(data);
    if (data.order_id) {
      const { data: dispatchRow } = await supabase
        .from("dispatches")
        .select("driver_base_fare,industrial_insurance_applicable")
        .eq("order_id", data.order_id)
        .maybeSingle();
      setDriverCalcInfo(
        dispatchRow
          ? {
              throughCalc: dispatchRow.driver_base_fare != null,
              insuranceApplied: !!dispatchRow.industrial_insurance_applicable,
            }
          : null
      );
    } else {
      setDriverCalcInfo(null);
    }
    setEditForm({
      status: data.status || "정산대기",
      tax_invoice_issued: data.tax_invoice_issued || false,
      tax_invoice_date: data.tax_invoice_date || "",
      payment_received: data.payment_received || false,
      payment_received_date: data.payment_received_date || "",
      driver_paid: data.driver_paid || false,
      driver_paid_date: data.driver_paid_date || "",
      brokerage_fee_paid: data.brokerage_fee_paid || false,
      brokerage_fee_paid_at: data.brokerage_fee_paid_at
        ? String(data.brokerage_fee_paid_at).slice(0, 10)
        : "",
    });
    setSettlementValue({
      collection_method: (data.collection_method as any) || "broker",
      billing_cycle: (data.billing_cycle as any) || "per_order",
      direct_collection_point: (data.direct_collection_point as any) || null,
    });
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 화주 입금완료 + 차주 지급완료가 둘 다 체크되면 "입금완료"로,
  // 둘 중 하나라도 체크 해제되면(자동으로 입금완료가 된 상태였을 때만) "정산대기"로 되돌림.
  // 단, 확정(잠금)된 건은 건드리지 않음 — 안 그러면 "차주지급완료"까지 체크된 채로
  // 정산확정한 건을 다시 열었을 때 이 효과가 즉시 "입금완료"로 덮어써버리는 버그가 있었음
  // (PR #61 실사용 리뷰에서 발견)
  // 자동상태동기화는 collection_method로 가장 먼저 분기(작업지시서 4-5) —
  // driver_direct 건은 WeCarry가 화주 수금·차주 지급을 하지 않으므로 이
  // 로직을 아예 타지 않고, brokerage_fee_paid 기준 별도 경로(정산확정 시
  // 검증)로 처리한다.
  useEffect(() => {
    if (invoice?.locked) return;
    if (settlementValue.collection_method !== "broker") return;
    if (editForm.payment_received && editForm.driver_paid) {
      if (editForm.status !== "입금완료") {
        setEditForm((prev) => ({ ...prev, status: "입금완료" }));
      }
    } else {
      if (editForm.status === "입금완료") {
        setEditForm((prev) => ({ ...prev, status: "정산대기" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.payment_received, editForm.driver_paid, invoice?.locked, settlementValue.collection_method]);

  async function handleSave(force = false, reason?: string) {
    setSaveError(null);
    setConflict(false);

    if (editForm.tax_invoice_issued && !editForm.tax_invoice_date) {
      setSaveError("세금계산서 발행완료를 체크하셨습니다. 발행일을 입력해주세요.");
      return;
    }
    if (settlementValue.collection_method === "broker") {
      if (editForm.payment_received && !editForm.payment_received_date) {
        setSaveError("화주 입금완료를 체크하셨습니다. 입금일을 입력해주세요.");
        return;
      }
      if (editForm.driver_paid && !editForm.driver_paid_date) {
        setSaveError("차주 지급완료를 체크하셨습니다. 지급일을 입력해주세요.");
        return;
      }
    } else {
      if (editForm.brokerage_fee_paid && !editForm.brokerage_fee_paid_at) {
        setSaveError("주선수수료 입금완료를 체크하셨습니다. 입금일을 입력해주세요.");
        return;
      }
    }

    // 확정(잠금)된 건이고 아직 수정 사유를 안 받았다면, 저장 대신 사유 입력
    // 모달부터 띄움(원칙 39번 패턴) — 실제 저장은 사유와 함께 다시 호출됨
    if (invoice.locked && !reason) {
      setAmendmentReasonOpen(true);
      return;
    }

    setSaving(true);

    const wasReceived = invoice.payment_received;
    const nowReceived = editForm.payment_received;

    const payload: Record<string, any> = {
      status: editForm.status,
      tax_invoice_issued: editForm.tax_invoice_issued,
      tax_invoice_date: editForm.tax_invoice_date || null,
    };
    if (settlementValue.collection_method === "broker") {
      payload.payment_received = editForm.payment_received;
      payload.payment_received_date = editForm.payment_received_date || null;
      payload.driver_paid = editForm.driver_paid;
      payload.driver_paid_date = editForm.driver_paid_date || null;
    } else {
      payload.brokerage_fee_paid = editForm.brokerage_fee_paid;
      payload.brokerage_fee_paid_at = editForm.brokerage_fee_paid_at || null;
    }

    // 이 저장 지점은 "잠긴 건인지"를 서버가 매번 새로 확인해야 해서 서버
    // API를 거침(클라이언트가 들고 있는 invoice.locked는 신선하지 않을 수
    // 있어 믿을 수 없음 — anon 클라이언트 직접 update는 더 이상 안 씀)
    const res = await fetch("/api/admin/invoices/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        payload,
        lastKnownUpdatedAt: invoice?.updated_at,
        force,
        reason,
      }),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSaving(false);
      setSaveError(result.error || "저장에 실패했습니다.");
      return;
    }
    if (result.conflict) {
      setSaving(false);
      setConflict(true);
      return;
    }

    // 입금 확인 상태가 바뀌면, 연결된 화주의 미수금을 전체 재계산합니다
    // (증분 방식 대신, 그 화주의 모든 미입금 정산건을 다시 합산 - 삭제된
    // 기록이 있어도 항상 정확합니다).
    if (settlementValue.collection_method === "broker" && invoice.companies?.id && wasReceived !== nowReceived) {
      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("id,customer_charge_total,payment_received")
        .eq("company_id", invoice.companies.id);
      const outstanding = (allInvoices || [])
        .filter((i) => i.id !== id) // 이 건은 아래서 최신 nowReceived 기준으로 따로 반영
        .filter((i) => !i.payment_received)
        .reduce((sum, i) => sum + (i.customer_charge_total || 0), 0);
      const thisAmount = nowReceived ? 0 : invoice.customer_charge_total || 0;
      await supabase
        .from("companies")
        .update({ outstanding_amount: outstanding + thisAmount })
        .eq("id", invoice.companies.id);
    }

    setSaving(false);
    setAmendmentReasonOpen(false);
    router.push("/admin/invoices");
  }

  // driver_direct(선착불) 건은 "정산확정 가능 조건"(작업지시서 4-5)을 실제로
  // 강제한다 — brokerage_fee>0이면 입금완료 체크가 먼저 필요하고, 0원+면제인
  // 경우만 입금확인 없이 바로 확정 가능. broker 건은 기존처럼 리마인더
  // 안내만 하고 강제 검증은 하지 않음(상태값 조합이 다양해 하드 검증이
  // 부적절하다고 판단, 기존 동작 유지).
  async function handleConfirmSettlement() {
    if (!invoice) return;
    if (settlementValue.collection_method === "driver_direct") {
      const fee = invoice.brokerage_fee || 0;
      const waived = invoice.brokerage_fee_payer === "waived";
      if (fee > 0 && !invoice.brokerage_fee_paid) {
        setSaveError("주선수수료가 아직 입금완료 처리되지 않았습니다. 먼저 입금완료를 체크하고 저장해주세요.");
        return;
      }
      if (fee === 0 && !waived) {
        setSaveError("주선수수료가 0원인데 지급자가 '면제'로 설정되어 있지 않습니다. 배차 상세에서 먼저 확인해주세요.");
        return;
      }
    }
    const confirmed = window.confirm(
      "정산을 확정하시겠습니까?\n\n확정 후에는 관리자만 사유를 남기고 예외적으로 수정할 수 있습니다.\n청구완료·입금완료·차주지급완료 상태인지 확인해주세요(리마인더용 안내이며, 다른 상태여도 확정 자체는 막지 않습니다)."
    );
    if (!confirmed) return;
    setConfirming(true);
    setSaveError(null);
    const res = await fetch("/api/admin/invoices/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await res.json().catch(() => ({}));
    setConfirming(false);
    if (!res.ok) {
      setSaveError(result.error || "정산확정에 실패했습니다.");
      return;
    }
    load();
  }

  // 로드맵 ②-A(작업지시서 4-5): 정산방식 변경도 원칙 44번 잠금검증 서버
  // API(app/api/admin/invoices/save)를 그대로 재사용 — 저장 직전 서버가
  // locked를 fresh 조회해서, 확정된 건은 관리자+사유입력만 허용한다.
  // 확정 전에는 사유 없이 자유롭게 변경 가능(오더/배차와 달리, 정산관리는
  // "확정 여부" 자체가 이미 사유 필요 기준이라 별도 임계값 판단이 필요 없음).
  async function handleSettlementFieldsChange(next: CollectionMethodValue, reason: string | null) {
    if (!invoice) return;
    setSettlementSaving(true);
    setSaveError(null);
    const before = settlementValue;
    const legacyMapped = mapToLegacySettlementType(
      next.collection_method,
      next.billing_cycle,
      next.direct_collection_point
    );
    const res = await fetch("/api/admin/invoices/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        payload: {
          collection_method: next.collection_method,
          billing_cycle: next.billing_cycle,
          direct_collection_point: next.collection_method === "driver_direct" ? next.direct_collection_point : null,
          ...(legacyMapped ? { settlement_type: legacyMapped } : {}),
        },
        lastKnownUpdatedAt: invoice?.updated_at,
        reason: reason || undefined,
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSettlementSaving(false);
      setSaveError(result.error || "정산방식 변경에 실패했습니다.");
      return;
    }
    if (reason) {
      const changes: [string, string | null, string | null][] = [
        ["collection_method", before.collection_method, next.collection_method],
        ["billing_cycle", before.billing_cycle, next.billing_cycle],
        ["direct_collection_point", before.direct_collection_point, next.direct_collection_point],
      ];
      for (const [fieldName, beforeValue, afterValue] of changes) {
        if (beforeValue === afterValue) continue;
        await logSettlementFieldChange({
          targetTable: "invoices",
          targetId: id,
          fieldName,
          beforeValue,
          afterValue,
          reason,
        });
      }
    }
    setSettlementSaving(false);
    setSettlementModalOpen(false);
    load();
  }

  async function handleDelete() {
    if (!invoice) return;
    const confirmed = window.confirm(
      "이 정산 기록을 삭제하시겠습니까? 되돌릴 수 없습니다. (화주 누적실적은 자동으로 되돌아가지 않으니 필요 시 화주 상세에서 직접 조정해주세요.)"
    );
    if (!confirmed) return;
    setDeleting(true);
    const res = await fetch("/api/admin/delete-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "invoices", id }),
    });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error || "삭제에 실패했습니다.");
      return;
    }
    router.push("/admin/invoices");
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="container">
        <div className="error-box">정산 정보를 불러오지 못했습니다. {error}</div>
        <Link href="/admin/invoices" className="btn btn-ghost">
          ← 목록으로
        </Link>
      </main>
    );
  }

  const statusColor = getInvoiceStatusColor(editForm.status);
  const fieldsLocked = invoice.locked && !isAdmin;
  // 로드맵 ②-B(작업지시서 6-2): 화주 측 상태의 기준값은 월정산 묶음이다 —
  // 이 건이 묶음에 담기면(customer_side_locked=true) 화주 측 필드(정산상태/
  // 정산방식/세금계산서/화주입금)는 개별 화면에서 손대지 않고 묶음 쪽
  // 처리 함수(mark_billing_batch_*)로만 바뀐다. 차주 지급 관련 필드는
  // 계속 활성화(관리자 여부와 무관 — fieldsLocked만 적용)
  const customerSideLocked = invoice.customer_side_locked === true;

  return (
    <main className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/invoices"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          ← 정산 목록으로
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {invoice.orders?.order_no || "정산 상세"}
            {invoice.orders?.loading_type === "mixable" && <MixableBadge />}
            {invoice.locked && <LockedBadge />}
          </h1>
          <p className="page-desc">
            {invoice.companies?.name || invoice.orders?.guest_name || "-"} ·{" "}
            {invoice.billing_period || "-"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isAdmin && !invoice.locked && (
            <button
              className="btn"
              onClick={handleConfirmSettlement}
              disabled={confirming}
              style={{
                padding: "9px 16px",
                borderRadius: "var(--radius)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {confirming ? "확정 중..." : "정산확정"}
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
              {deleting ? "확인 중..." : "삭제"}
            </button>
          )}
        </div>
      </div>

      {saveError && <div className="error-box">오류: {saveError}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
            정산상태
          </div>
          <select
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            disabled={fieldsLocked || customerSideLocked}
            style={{
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: 999,
              border: "none",
              background: statusColor.bg,
              color: statusColor.text,
            }}
          >
            {INVOICE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {customerSideLocked && (
          <div
            className="badge"
            style={{ display: "block", marginBottom: 14, padding: "10px 12px", fontSize: 12.5 }}
          >
            이 건은 [{invoice.companies?.name || "-"}] {invoice.billing_period || "-"} 월정산
            묶음에 포함되어 있습니다. 세금계산서·화주입금·정산상태는 이 화면이 아니라{" "}
            <Link
              href={`/admin/invoices?tab=monthly&company=${invoice.company_id || ""}&month=${
                invoice.billing_period || ""
              }`}
              style={{ textDecoration: "underline" }}
            >
              월정산 묶음 화면
            </Link>
            에서 처리해주세요.
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
                정산방식
              </div>
              {!invoice.locked && !customerSideLocked ? (
                <div style={{ maxWidth: 420 }}>
                  <CollectionMethodInput
                    namePrefix="invoice_settlement"
                    value={settlementValue}
                    onChange={(next) => handleSettlementFieldsChange(next, null)}
                  />
                </div>
              ) : (
                <span className="badge">
                  {getSettlementDisplayLabel(invoice.collection_method, invoice.billing_cycle)}
                  {getPaymentConditionLabel(invoice.direct_collection_point) && (
                    <> · {getPaymentConditionLabel(invoice.direct_collection_point)}</>
                  )}
                </span>
              )}
            </div>
            {invoice.locked && !customerSideLocked && (
              <button
                type="button"
                className="btn-ghost"
                disabled={fieldsLocked}
                style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}
                onClick={() => setSettlementModalOpen(true)}
              >
                정산방식 변경
              </button>
            )}
          </div>
          {invoice.locked && (
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
              확정된 건이라 정산방식을 바꾸려면 사유를 입력해야 합니다.
              {!isAdmin && " (관리자만 변경 가능)"}
            </p>
          )}
        </div>

        {settlementModalOpen && (
          <SettlementFieldsChangeModal
            currentValue={settlementValue}
            onCancel={() => setSettlementModalOpen(false)}
            onConfirm={(next, reason) => handleSettlementFieldsChange(next, reason)}
            saving={settlementSaving}
          />
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {settlementValue.collection_method === "broker" ? (
            <>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  화주 청구금액
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {won(invoice.customer_charge_total)}
                </div>
                {invoice.customer_charge_total != null && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>부가세 별도</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  차주 지급금액
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {won(invoice.driver_payout_total)}
                </div>
                {invoice.driver_payout_total != null && driverCalcInfo?.throughCalc && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    부가세 포함
                    {driverCalcInfo.insuranceApplied && " · 산재보험료 차감됨"}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  수수료(마진)
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {won(invoice.commission_total)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>전체 운송료</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{won(invoice.total_freight_amount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>차주 직접수금액</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{won(invoice.driver_direct_collection_amount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>주선수수료(실질수익)</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{won(invoice.brokerage_fee)}</div>
                {invoice.brokerage_fee != null && invoice.brokerage_fee > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    부가세 {won(calcVatAmount(invoice.brokerage_fee))} · 포함{" "}
                    {won(calcInclusiveAmount(invoice.brokerage_fee))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>수수료 지급자</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{getBrokerageFeePayerLabel(invoice.brokerage_fee_payer)}</div>
              </div>
            </>
          )}
          {invoice.orders?.id && (
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                연결 오더
              </div>
              <Link
                href={`/admin/orders/${invoice.orders.id}`}
                style={{ fontSize: 13, textDecoration: "underline" }}
              >
                오더 페이지로 이동 →
              </Link>
            </div>
          )}
          {invoice.companies?.id ? (
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                화주
              </div>
              <Link
                href={`/admin/companies/${invoice.companies.id}`}
                style={{ fontSize: 13, textDecoration: "underline" }}
              >
                {invoice.companies.name} 페이지로 이동 →
              </Link>
            </div>
          ) : (
            invoice.orders?.guest_name && (
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  화주
                </div>
                <div style={{ fontSize: 13.5 }}>
                  {invoice.orders.guest_name}{" "}
                  <span className="badge" style={{ marginLeft: 4 }}>
                    개인
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          세금계산서 · 입금 · 지급
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <div>
            <label
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                checked={editForm.tax_invoice_issued}
                disabled={fieldsLocked || customerSideLocked}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    tax_invoice_issued: e.target.checked,
                  })
                }
              />
              세금계산서 발행완료
            </label>
            <input
              type="date"
              value={editForm.tax_invoice_date}
              onChange={(e) =>
                setEditForm({ ...editForm, tax_invoice_date: e.target.value })
              }
              disabled={fieldsLocked || customerSideLocked || !editForm.tax_invoice_issued}
            />
          </div>

          {settlementValue.collection_method === "broker" ? (
            <>
              <div>
                <label
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editForm.payment_received}
                    disabled={fieldsLocked || customerSideLocked}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        payment_received: e.target.checked,
                      })
                    }
                  />
                  화주 입금완료
                </label>
                <input
                  type="date"
                  value={editForm.payment_received_date}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      payment_received_date: e.target.value,
                    })
                  }
                  disabled={fieldsLocked || customerSideLocked || !editForm.payment_received}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editForm.driver_paid}
                    disabled={fieldsLocked}
                    onChange={(e) =>
                      setEditForm({ ...editForm, driver_paid: e.target.checked })
                    }
                  />
                  차주 지급완료
                </label>
                <input
                  type="date"
                  value={editForm.driver_paid_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, driver_paid_date: e.target.value })
                  }
                  disabled={fieldsLocked || !editForm.driver_paid}
                />
              </div>
            </>
          ) : (
            <div>
              <label
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={editForm.brokerage_fee_paid}
                  disabled={fieldsLocked}
                  onChange={(e) => setEditForm({ ...editForm, brokerage_fee_paid: e.target.checked })}
                />
                주선수수료 입금완료
              </label>
              <input
                type="date"
                value={editForm.brokerage_fee_paid_at}
                onChange={(e) => setEditForm({ ...editForm, brokerage_fee_paid_at: e.target.value })}
                disabled={fieldsLocked || !editForm.brokerage_fee_paid}
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, marginBottom: 0 }}>
                선착불(차주 직접수금) 건이라 화주 입금·차주 지급 개념이 적용되지 않습니다 —
                차주는 화주에게 직접 운임을 수금하고, WeCarry는 주선수수료만 정산받습니다.
              </p>
            </div>
          )}
        </div>

        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 14 }}>
          {settlementValue.collection_method === "broker"
            ? "\"화주 입금완료\"를 체크하면 연결된 화주의 미수금이 자동으로 차감됩니다."
            : "주선수수료 입금완료 체크는 화주 미수금 계산에 영향을 주지 않습니다."}
          {fieldsLocked && " 이 건은 확정(잠금)되어 관리자만 수정할 수 있습니다."}
          {customerSideLocked && " 세금계산서·화주입금은 월정산 묶음에서만 처리할 수 있습니다."}
        </p>
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

      {saveError && <div className="error-box">오류: {saveError}</div>}
      {!fieldsLocked && (
        <button className="btn" onClick={() => handleSave()} disabled={saving}>
          {saving ? "저장 중..." : "변경사항 저장"}
        </button>
      )}

      {amendmentReasonOpen && (
        <AmendmentReasonModal
          title="확정된 정산 건 수정"
          description="이미 확정(잠금)된 정산 건입니다. 수정하려면 사유를 남겨야 하며, 수정 전/후 내용이 기록됩니다."
          onCancel={() => setAmendmentReasonOpen(false)}
          onConfirm={(reason) => handleSave(false, reason)}
          saving={saving}
        />
      )}

      <ProcessedByFooter
        createdBy={invoice.created_by}
        createdAt={invoice.created_at}
        updatedBy={invoice.updated_by}
        updatedAt={invoice.updated_at}
      />
    </main>
  );
}
