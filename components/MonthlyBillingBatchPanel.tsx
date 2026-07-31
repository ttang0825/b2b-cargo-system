"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentStaffRole } from "@/lib/currentStaff";
import { getBillingBatchReasonLabel } from "@/lib/billingBatchReasons";

// 로드맵 ②-B: 정산관리 "월정산 묶음" 탭(작업지시서 6-1). 화주+기간(월 단위)을
// 고르면 그 조합의 묶음(draft/confirmed/cancelled)을 조회하고, draft면
// 후보(broker+monthly+정산대기 상태) invoice를 담아 확정까지 진행한다.
// 모든 쓰기는 app/api/admin/billing-batches/* 서버 API(서비스 롤 RPC)를
// 거치고, 조회는 기존 admin 패턴대로 anon 클라이언트 직접 조회.

type Company = { id: string; name: string };

type Batch = {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  batch_status: "draft" | "confirmed" | "cancelled";
  tax_invoice_status: "not_issued" | "issued";
  tax_invoice_issued_at: string | null;
  payment_status: "unpaid" | "paid" | "overdue";
  payment_due_date: string | null;
  paid_at: string | null;
  supply_amount: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  cancel_reason: string | null;
  confirmed_by_name_snapshot: string | null;
  cancelled_by_name_snapshot: string | null;
};

type CandidateRow = {
  invoice_id: string;
  company_id: string;
  billing_period: string | null;
  customer_charge_total: number | null;
  order_id: string | null;
};

type ActiveItem = {
  id: string;
  invoice_id: string;
  supply_amount_snapshot: number;
  vat_amount_snapshot: number;
  total_amount_snapshot: number;
};

function won(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function currentMonthInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthToPeriod(monthInput: string) {
  const [y, m] = monthInput.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { period_start: fmt(start), period_end: fmt(end) };
}

async function callBatchApi(path: string, body: Record<string, any>) {
  const res = await fetch(`/api/admin/billing-batches/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, reason: data?.error ? undefined : "unknown", error: data?.error };
  }
  return data;
}

export default function MonthlyBillingBatchPanel({
  initialCompanyId = "",
  initialMonth = "",
}: {
  initialCompanyId?: string;
  initialMonth?: string;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [month, setMonth] = useState(initialMonth || currentMonthInput());
  const [batch, setBatch] = useState<Batch | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [activeItems, setActiveItems] = useState<ActiveItem[]>([]);
  const [orderNoByInvoiceId, setOrderNoByInvoiceId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [validatePreview, setValidatePreview] = useState<any>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [showReleaseReason, setShowReleaseReason] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [recentBatches, setRecentBatches] = useState<Batch[]>([]);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
    supabase
      .from("companies")
      .select("id,name")
      .order("name", { ascending: true })
      .then(({ data }) => setCompanies((data as any) || []));
    loadRecentBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRecentBatches() {
    const { data } = await supabase
      .from("customer_billing_batches")
      .select(
        "id,company_id,period_start,period_end,batch_status,tax_invoice_status,tax_invoice_issued_at,payment_status,payment_due_date,paid_at,supply_amount,vat_amount,total_amount,cancel_reason,confirmed_by_name_snapshot,cancelled_by_name_snapshot,companies(name)"
      )
      .order("period_start", { ascending: false })
      .limit(30);
    setRecentBatches((data as any) || []);
  }

  async function loadBatchFor(targetCompanyId: string, targetMonth: string) {
    setActionError(null);
    setValidatePreview(null);
    setBatch(null);
    setCandidates([]);
    setActiveItems([]);
    if (!targetCompanyId || !targetMonth) return;
    setLoading(true);

    const { period_start, period_end } = monthToPeriod(targetMonth);
    const { data: existing } = await supabase
      .from("customer_billing_batches")
      .select(
        "id,company_id,period_start,period_end,batch_status,tax_invoice_status,tax_invoice_issued_at,payment_status,payment_due_date,paid_at,supply_amount,vat_amount,total_amount,cancel_reason,confirmed_by_name_snapshot,cancelled_by_name_snapshot"
      )
      .eq("company_id", targetCompanyId)
      .eq("period_start", period_start)
      .eq("period_end", period_end)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setBatch(existing as any);
      setDueDate((existing as any).payment_due_date || "");
      if ((existing as any).batch_status === "draft") {
        await loadDraftContents((existing as any).id, targetCompanyId, targetMonth);
      } else {
        await loadActiveItems((existing as any).id);
      }
    } else {
      await loadCandidatesOnly(targetCompanyId, targetMonth);
    }
    setLoading(false);
  }

  async function loadCandidatesOnly(targetCompanyId: string, targetMonth: string) {
    const { data } = await supabase
      .from("customer_billing_batch_candidates")
      .select("invoice_id,company_id,billing_period,customer_charge_total,order_id")
      .eq("company_id", targetCompanyId)
      .eq("billing_period", targetMonth);
    setCandidates((data as any) || []);
    await loadOrderNumbers((data as any) || []);
  }

  async function loadDraftContents(batchId: string, targetCompanyId: string, targetMonth: string) {
    await loadCandidatesOnly(targetCompanyId, targetMonth);
    await loadActiveItems(batchId);
  }

  async function loadActiveItems(batchId: string) {
    const { data } = await supabase
      .from("customer_billing_batch_items")
      .select("id,invoice_id,supply_amount_snapshot,vat_amount_snapshot,total_amount_snapshot")
      .eq("batch_id", batchId)
      .is("released_at", null);
    const items = (data as any as ActiveItem[]) || [];
    setActiveItems(items);
    await loadOrderNumbers(items.map((i) => ({ invoice_id: i.invoice_id })) as any);
  }

  async function loadOrderNumbers(rows: { invoice_id: string }[]) {
    const ids = rows.map((r) => r.invoice_id).filter(Boolean);
    if (ids.length === 0) return;
    const { data: invs } = await supabase.from("invoices").select("id,order_id").in("id", ids);
    const orderIds = ((invs as any[]) || []).map((i) => i.order_id).filter(Boolean);
    if (orderIds.length === 0) return;
    const { data: orders } = await supabase.from("orders").select("id,order_no").in("id", orderIds);
    const orderNoByOrderId: Record<string, string> = {};
    ((orders as any[]) || []).forEach((o) => (orderNoByOrderId[o.id] = o.order_no || "-"));
    const map: Record<string, string> = {};
    ((invs as any[]) || []).forEach((i) => {
      map[i.id] = i.order_id ? orderNoByOrderId[i.order_id] || "-" : "-";
    });
    setOrderNoByInvoiceId((prev) => ({ ...prev, ...map }));
  }

  useEffect(() => {
    loadBatchFor(companyId, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, month]);

  async function handleCreateBatch() {
    setActionError(null);
    const { period_start, period_end } = monthToPeriod(month);
    const result = await callBatchApi("create", { company_id: companyId, period_start, period_end });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadBatchFor(companyId, month);
    await loadRecentBatches();
  }

  async function handleAddItem(invoiceId: string) {
    if (!batch) return;
    setActionError(null);
    const result = await callBatchApi("add-item", { batch_id: batch.id, invoice_id: invoiceId });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadDraftContents(batch.id, companyId, month);
  }

  async function handleRemoveItem(itemId: string) {
    if (!batch) return;
    setActionError(null);
    const result = await callBatchApi("remove-item", { batch_id: batch.id, item_id: itemId });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadDraftContents(batch.id, companyId, month);
  }

  async function handleDeleteDraft() {
    if (!batch) return;
    if (!confirm("이 작성 중인 묶음을 삭제할까요? 담긴 항목도 모두 제거됩니다.")) return;
    setActionError(null);
    const result = await callBatchApi("delete-draft", { batch_id: batch.id });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadBatchFor(companyId, month);
    await loadRecentBatches();
  }

  async function handleValidate() {
    if (!batch) return;
    setActionError(null);
    const result = await callBatchApi("validate", { batch_id: batch.id });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      setValidatePreview(null);
      return;
    }
    setValidatePreview(result);
  }

  async function handleConfirm() {
    if (!batch) return;
    if (!confirm("이 묶음을 확정할까요? 확정 후에는 담긴 정산 건을 개별 화면에서 수정할 수 없습니다.")) return;
    setActionError(null);
    const result = await callBatchApi("confirm", { batch_id: batch.id });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    setValidatePreview(null);
    await loadBatchFor(companyId, month);
    await loadRecentBatches();
  }

  async function handleRelease() {
    if (!batch) return;
    if (!releaseReason.trim()) {
      setActionError("해제 사유를 입력해주세요.");
      return;
    }
    setActionError(null);
    const result = await callBatchApi("release", { batch_id: batch.id, reason: releaseReason });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    setShowReleaseReason(false);
    setReleaseReason("");
    await loadBatchFor(companyId, month);
    await loadRecentBatches();
  }

  async function handleMarkTaxInvoiceIssued() {
    if (!batch) return;
    setActionError(null);
    const result = await callBatchApi("mark-tax-invoice-issued", { batch_id: batch.id });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadBatchFor(companyId, month);
    await loadRecentBatches();
  }

  async function handleMarkPaymentReceived() {
    if (!batch) return;
    if (!confirm("이 묶음에 담긴 모든 정산 건을 입금완료 처리할까요?")) return;
    setActionError(null);
    const result = await callBatchApi("mark-payment-received", { batch_id: batch.id });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadBatchFor(companyId, month);
    await loadRecentBatches();
  }

  async function handleSetDueDate() {
    if (!batch || !dueDate) return;
    setActionError(null);
    const result = await callBatchApi("set-payment-due-date", { batch_id: batch.id, due_date: dueDate });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadBatchFor(companyId, month);
    await loadRecentBatches();
  }

  const activeTotal = activeItems.reduce((sum, i) => sum + (i.total_amount_snapshot || 0), 0);
  const activeSupply = activeItems.reduce((sum, i) => sum + (i.supply_amount_snapshot || 0), 0);
  const activeVat = activeItems.reduce((sum, i) => sum + (i.vat_amount_snapshot || 0), 0);
  const activeInvoiceIds = new Set(activeItems.map((i) => i.invoice_id));
  const availableCandidates = candidates.filter((c) => !activeInvoiceIds.has(c.invoice_id));

  return (
    <div>
      <div className="form-grid" style={{ padding: 0, marginBottom: 16, maxWidth: 480 }}>
        <div className="field">
          <label>화주</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">선택</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>정산월</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {actionError && <div className="error-box">오류: {actionError}</div>}

      {loading && <div className="empty-state">불러오는 중...</div>}

      {!loading && companyId && month && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          {!batch && (
            <>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 0 }}>
                이 화주·기간에는 아직 묶음이 없습니다. 후보 {candidates.length}건을 확인했습니다.
              </p>
              <button className="btn" onClick={handleCreateBatch} disabled={candidates.length === 0}>
                묶음 만들기
              </button>
              {candidates.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  묶을 수 있는 정산 건(주선사 정산·월정산, 정산대기 상태)이 없습니다.
                </p>
              )}
            </>
          )}

          {batch && batch.batch_status === "draft" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, margin: 0 }}>작성 중(draft)</h3>
                <button className="btn-danger" style={{ fontSize: 12.5, padding: "6px 10px" }} onClick={handleDeleteDraft}>
                  묶음 삭제
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, marginBottom: 8 }}>포함된 정산 건 ({activeItems.length})</h4>
                {activeItems.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>아직 담긴 건이 없습니다.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>오더번호</th>
                        <th>공급가액</th>
                        <th>부가세</th>
                        <th>합계</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeItems.map((it) => (
                        <tr key={it.id}>
                          <td>{orderNoByInvoiceId[it.invoice_id] || "-"}</td>
                          <td>{won(it.supply_amount_snapshot)}</td>
                          <td>{won(it.vat_amount_snapshot)}</td>
                          <td>{won(it.total_amount_snapshot)}</td>
                          <td>
                            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => handleRemoveItem(it.id)}>
                              제거
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>
                  합계: 공급가액 {won(activeSupply)} · 부가세 {won(activeVat)} · 총액 {won(activeTotal)}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, marginBottom: 8 }}>추가 가능한 후보 ({availableCandidates.length})</h4>
                {availableCandidates.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>추가할 수 있는 건이 없습니다.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>오더번호</th>
                        <th>화주 청구금액(공급가액)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableCandidates.map((c) => (
                        <tr key={c.invoice_id}>
                          <td>{orderNoByInvoiceId[c.invoice_id] || "-"}</td>
                          <td>{won(c.customer_charge_total)}</td>
                          <td>
                            <button className="btn" style={{ fontSize: 12 }} onClick={() => handleAddItem(c.invoice_id)}>
                              추가
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <button className="btn btn-ghost" onClick={handleValidate} style={{ marginRight: 8 }}>
                  확정 전 미리보기
                </button>
                {isAdmin ? (
                  <button className="btn" onClick={handleConfirm} disabled={activeItems.length === 0}>
                    확정
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>확정은 관리자만 할 수 있습니다.</span>
                )}
                {validatePreview && (
                  <div style={{ marginTop: 12, fontSize: 12.5 }}>
                    <p style={{ margin: "4px 0" }}>
                      미리보기 합계: 공급가액 {won(validatePreview.preview_supply_amount)} · 부가세{" "}
                      {won(validatePreview.preview_vat_amount)} · 총액 {won(validatePreview.preview_total_amount)}
                    </p>
                    <p style={{ margin: "4px 0", color: validatePreview.can_confirm ? "var(--accent)" : "var(--danger)" }}>
                      {validatePreview.can_confirm ? "확정 가능한 상태입니다." : "확정 전 확인이 필요한 항목이 있습니다."}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {batch && batch.batch_status === "confirmed" && (
            <>
              <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 12 }}>확정됨</h3>
              <div className="form-grid" style={{ padding: 0, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>공급가액</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{won(batch.supply_amount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>부가세</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{won(batch.vat_amount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>총액</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{won(batch.total_amount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>세금계산서</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {batch.tax_invoice_status === "issued" ? "발행완료" : "미발행"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>입금상태</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {batch.payment_status === "paid" ? "입금완료" : batch.payment_status === "overdue" ? "연체" : "미입금"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>포함 건수</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{activeItems.length}건</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {batch.tax_invoice_status !== "issued" && (
                  <button className="btn" onClick={handleMarkTaxInvoiceIssued}>
                    세금계산서 발행 처리
                  </button>
                )}
                {batch.payment_status !== "paid" && (
                  <button className="btn" onClick={handleMarkPaymentReceived}>
                    입금완료 처리
                  </button>
                )}
              </div>

              <div className="field" style={{ maxWidth: 260, marginBottom: 14 }}>
                <label>납부기한</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  <button className="btn btn-ghost" onClick={handleSetDueDate}>
                    저장
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <h4 style={{ fontSize: 13, marginBottom: 8 }}>포함된 정산 건</h4>
                <table>
                  <thead>
                    <tr>
                      <th>오더번호</th>
                      <th>공급가액</th>
                      <th>부가세</th>
                      <th>합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((it) => (
                      <tr key={it.id}>
                        <td>
                          <Link href={`/admin/invoices/${it.invoice_id}`}>{orderNoByInvoiceId[it.invoice_id] || "-"}</Link>
                        </td>
                        <td>{won(it.supply_amount_snapshot)}</td>
                        <td>{won(it.vat_amount_snapshot)}</td>
                        <td>{won(it.total_amount_snapshot)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  {!showReleaseReason ? (
                    <button className="btn-danger" onClick={() => setShowReleaseReason(true)}>
                      묶음 해제
                    </button>
                  ) : (
                    <div>
                      <div className="field" style={{ maxWidth: 400 }}>
                        <label>해제 사유 *</label>
                        <input
                          type="text"
                          value={releaseReason}
                          onChange={(e) => setReleaseReason(e.target.value)}
                          placeholder="해제 사유를 입력해주세요"
                        />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <button className="btn-danger" onClick={handleRelease} style={{ marginRight: 8 }}>
                          해제 확정
                        </button>
                        <button className="btn btn-ghost" onClick={() => setShowReleaseReason(false)}>
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
                    세금계산서가 발행됐거나 입금 처리가 진행된 묶음은 해제할 수 없습니다.
                  </p>
                </div>
              )}
            </>
          )}

          {batch && batch.batch_status === "cancelled" && (
            <>
              <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 8 }}>해제됨(취소)</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>사유: {batch.cancel_reason || "-"}</p>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                해제 처리자: {batch.cancelled_by_name_snapshot || "-"}
              </p>
            </>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 12 }}>최근 묶음 30건</h3>
        {recentBatches.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>아직 만들어진 묶음이 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>화주</th>
                <th>기간</th>
                <th>상태</th>
                <th>세금계산서</th>
                <th>입금</th>
                <th>총액</th>
              </tr>
            </thead>
            <tbody>
              {recentBatches.map((b: any) => (
                <tr
                  key={b.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setCompanyId(b.company_id);
                    setMonth(String(b.period_start).slice(0, 7));
                  }}
                >
                  <td>{b.companies?.name || "-"}</td>
                  <td>{b.period_start} ~ {b.period_end}</td>
                  <td>
                    {b.batch_status === "draft" ? "작성중" : b.batch_status === "confirmed" ? "확정" : "해제됨"}
                  </td>
                  <td>{b.tax_invoice_status === "issued" ? "발행완료" : "미발행"}</td>
                  <td>{b.payment_status === "paid" ? "완료" : b.payment_status === "overdue" ? "연체" : "대기"}</td>
                  <td>{won(b.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
