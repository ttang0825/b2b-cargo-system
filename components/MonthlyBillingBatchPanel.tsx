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
  settlement_reference_date: string | null;
};

type AllCandidateRow = CandidateRow & { company_name: string; order_no: string; cycle_month: string };

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

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 화주별 정산 마감일(companies.billing_cutoff_day)이 없으면 기존처럼
// 달력월(1일~말일), 있으면 "전월 (마감일+1)일 ~ 이번달 마감일" 주기로
// 계산(PR #64 리뷰 피드백 — 화주마다 정산 마감일이 다를 수 있다는 지적 반영)
function monthToPeriod(monthInput: string, cutoffDay: number | null) {
  const [y, m] = monthInput.split("-").map(Number);
  if (!cutoffDay) {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { period_start: fmtDate(start), period_end: fmtDate(end) };
  }
  const end = new Date(y, m - 1, cutoffDay);
  const start = new Date(y, m - 2, cutoffDay + 1);
  return { period_start: fmtDate(start), period_end: fmtDate(end) };
}

// 특정 날짜가 화주의 정산 마감일 기준으로 어느 "정산월" 라벨에 속하는지
// 역산 — 전체 후보 목록에서 특정 건을 골랐을 때 정산월 선택창에 자동으로
// 채워주는 용도
function monthLabelForDate(dateStr: string, cutoffDay: number | null) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (!cutoffDay) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  let y = d.getFullYear();
  let m = d.getMonth() + 1;
  if (d.getDate() > cutoffDay) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return `${y}-${String(m).padStart(2, "0")}`;
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
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
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
  const [forceDeleteReason, setForceDeleteReason] = useState("");
  const [showForceDeleteReason, setShowForceDeleteReason] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [recentBatches, setRecentBatches] = useState<Batch[]>([]);
  const [allCandidates, setAllCandidates] = useState<AllCandidateRow[]>([]);
  const [companyCutoffDay, setCompanyCutoffDay] = useState<number | null>(null);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
    loadRecentBatches();
    loadAllCandidates();
    if (initialCompanyId) {
      supabase
        .from("companies")
        .select("id,name")
        .eq("id", initialCompanyId)
        .maybeSingle()
        .then(({ data }) => data && setSelectedCompany(data as Company));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 화주 업체 검색(admin/orders의 화주 검색과 동일한 패턴) — 업체 수가
  // 많아지면 드롭다운을 스크롤하며 찾아야 해서 불편하다는 실사용 피드백으로
  // 전체 목록 대신 이름 검색 방식으로 교체
  useEffect(() => {
    let active = true;
    async function search() {
      if (companySearch.trim().length < 1) {
        setCompanyResults([]);
        return;
      }
      const { data } = await supabase
        .from("companies")
        .select("id,name")
        .ilike("name", `%${companySearch}%`)
        .order("name", { ascending: true })
        .limit(8);
      if (active) setCompanyResults((data as Company[]) || []);
    }
    const t = setTimeout(search, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [companySearch]);

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

  // 화주를 하나씩 찾아서 확인하지 않아도 조건에 맞는 후보(주선사정산·월정산·
  // 정산대기, 아직 어느 묶음에도 안 담긴 건)가 전체 화주 기준으로 한눈에
  // 보이도록 함(PR #64 실사용 피드백) — customer_billing_batch_candidates
  // 뷰는 회사명/오더번호가 없어서 별도로 조회해 붙여줌
  async function loadAllCandidates() {
    const { data: rows } = await supabase
      .from("customer_billing_batch_candidates")
      .select("invoice_id,company_id,billing_period,customer_charge_total,order_id,settlement_reference_date")
      .order("settlement_reference_date", { ascending: false })
      .limit(200);
    const list = (rows as CandidateRow[]) || [];
    if (list.length === 0) {
      setAllCandidates([]);
      return;
    }

    const companyIds = Array.from(new Set(list.map((r) => r.company_id).filter(Boolean)));
    const orderIds = Array.from(new Set(list.map((r) => r.order_id).filter(Boolean))) as string[];
    const [{ data: companiesData }, { data: ordersData }] = await Promise.all([
      companyIds.length
        ? supabase.from("companies").select("id,name,billing_cutoff_day").in("id", companyIds)
        : Promise.resolve({ data: [] as any[] }),
      orderIds.length
        ? supabase.from("orders").select("id,order_no").in("id", orderIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const companyNameById: Record<string, string> = {};
    const cutoffDayById: Record<string, number | null> = {};
    (companiesData || []).forEach((c: any) => {
      companyNameById[c.id] = c.name;
      cutoffDayById[c.id] = c.billing_cutoff_day ?? null;
    });
    const orderNoById: Record<string, string> = {};
    (ordersData || []).forEach((o: any) => (orderNoById[o.id] = o.order_no || "-"));

    setAllCandidates(
      list.map((r) => ({
        ...r,
        company_name: companyNameById[r.company_id] || "-",
        order_no: r.order_id ? orderNoById[r.order_id] || "-" : "-",
        cycle_month: r.settlement_reference_date
          ? monthLabelForDate(r.settlement_reference_date, cutoffDayById[r.company_id] ?? null)
          : "-",
      }))
    );
  }

  async function refreshOverview() {
    await loadRecentBatches();
    await loadAllCandidates();
  }

  async function loadBatchFor(targetCompanyId: string, targetMonth: string) {
    setActionError(null);
    setValidatePreview(null);
    setBatch(null);
    setCandidates([]);
    setActiveItems([]);
    if (!targetCompanyId || !targetMonth) return;
    setLoading(true);

    // 화주별 정산 마감일 설정을 매번 fresh 조회 — 이 값에 따라 기간 계산
    // 방식이 달라짐(PR #64 리뷰 피드백)
    const { data: companyRow } = await supabase
      .from("companies")
      .select("billing_cutoff_day")
      .eq("id", targetCompanyId)
      .maybeSingle();
    const cutoffDay = (companyRow as any)?.billing_cutoff_day ?? null;
    setCompanyCutoffDay(cutoffDay);

    const commonSelect =
      "id,company_id,period_start,period_end,batch_status,tax_invoice_status,tax_invoice_issued_at,payment_status,payment_due_date,paid_at,supply_amount,vat_amount,total_amount,cancel_reason,confirmed_by_name_snapshot,cancelled_by_name_snapshot";

    // 기존 묶음 검색은 "화주의 현재 마감일 설정으로 역산한 기간"과 정확히
    // 일치하는지 비교하지 않는다 — 마감일 설정이 묶음 생성 이후에 바뀌면
    // (예: 처음엔 마감일 미설정으로 달력월 묶음을 만들고, 나중에 마감일을
    // 지정한 경우) 과거 묶음의 저장된 period_start/end는 그 당시 계산값
    // 그대로라 재계산한 값과 어긋나 못 찾게 된다(실사용 버그 — "최근 묶음"
    // 목록에서 확정건을 클릭해도 상세가 안 뜨던 문제). 대신 "이 정산월
    // 라벨에 해당하는 period_end"는 마감일 설정과 무관하게 항상 그 달력월
    // 안에 있다는 성질(monthToPeriod의 end 계산 방식상 항상 같은 달)을
    // 이용해, period_end가 이 달력월 범위 안에 있는 묶음을 찾는다.
    const [labelYear, labelMonth] = targetMonth.split("-").map(Number);
    const monthRangeStart = `${targetMonth}-01`;
    const monthRangeEnd = fmtDate(new Date(labelYear, labelMonth, 0));

    // 이 화주·기간의 가장 최근 묶음을 가져온다. draft/confirmed(=아직
    // 살아있는 묶음)면 그 내용을 그대로 보여주고, cancelled(해제됨)면
    // 참고용으로 보여주면서도 새 묶음을 다시 만들 수 있게 후보를 같이
    // 조회한다(해제 후 재묶음이 안 되던 버그, PR #64 리뷰 피드백)
    const { data: latest } = await supabase
      .from("customer_billing_batches")
      .select(commonSelect)
      .eq("company_id", targetCompanyId)
      .gte("period_end", monthRangeStart)
      .lte("period_end", monthRangeEnd)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 새 묶음을 만들 때 쓸 기간은 화주의 현재 마감일 설정 기준으로 계산하되,
    // 기존 묶음을 찾았으면 그 묶음 고유의 저장된 기간을 그대로 쓴다(재계산값과
    // 어긋날 수 있으므로 화면에 보여주는 후보·항목도 실제 저장된 기간 기준이어야 함)
    const { period_start, period_end } = latest
      ? { period_start: (latest as any).period_start, period_end: (latest as any).period_end }
      : monthToPeriod(targetMonth, cutoffDay);

    if (latest && (latest as any).batch_status !== "cancelled") {
      setBatch(latest as any);
      setDueDate((latest as any).payment_due_date || "");
      if ((latest as any).batch_status === "draft") {
        await loadDraftContents((latest as any).id, targetCompanyId, period_start, period_end);
      } else {
        // 확정된 묶음이어도, 확정 이후에 새로 정산등록된 건이 있으면
        // 보충 묶음으로 담을 수 있어야 하므로 후보도 같이 조회해둔다
        // (PR #64 리뷰 피드백 — "묶음 확정되면 추가되는 정산은 어떻게
        // 추가하나?")
        await loadActiveItems((latest as any).id);
        await loadCandidatesOnly(targetCompanyId, period_start, period_end);
      }
    } else {
      if (latest) setBatch(latest as any);
      await loadCandidatesOnly(targetCompanyId, period_start, period_end);
    }
    setLoading(false);
  }

  // 후보 판정은 billing_period 텍스트 일치가 아니라 settlement_reference_date가
  // 이 기간(period_start~period_end) 안에 있는지로 함 — 화주마다 정산
  // 마감일이 다를 수 있어서 "YYYY-MM" 한 덩어리로는 표현이 안 됨(PR #64
  // 리뷰 피드백)
  async function loadCandidatesOnly(targetCompanyId: string, periodStart: string, periodEnd: string) {
    const { data } = await supabase
      .from("customer_billing_batch_candidates")
      .select("invoice_id,company_id,billing_period,customer_charge_total,order_id,settlement_reference_date")
      .eq("company_id", targetCompanyId)
      .gte("settlement_reference_date", periodStart)
      .lte("settlement_reference_date", periodEnd);
    setCandidates((data as any) || []);
    await loadOrderNumbers((data as any) || []);
  }

  async function loadDraftContents(batchId: string, targetCompanyId: string, periodStart: string, periodEnd: string) {
    await loadCandidatesOnly(targetCompanyId, periodStart, periodEnd);
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
    const { period_start, period_end } = monthToPeriod(month, companyCutoffDay);
    const result = await callBatchApi("create", { company_id: companyId, period_start, period_end });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadBatchFor(companyId, month);
    await refreshOverview();
  }

  async function handleAddItem(invoiceId: string) {
    if (!batch) return;
    setActionError(null);
    const result = await callBatchApi("add-item", { batch_id: batch.id, invoice_id: invoiceId });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadDraftContents(batch.id, companyId, batch.period_start, batch.period_end);
  }

  async function handleRemoveItem(itemId: string) {
    if (!batch) return;
    setActionError(null);
    const result = await callBatchApi("remove-item", { batch_id: batch.id, item_id: itemId });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadDraftContents(batch.id, companyId, batch.period_start, batch.period_end);
  }

  async function handleDeleteBatch() {
    if (!batch) return;
    const msg =
      batch.batch_status === "draft"
        ? "이 작성 중인 묶음을 삭제할까요? 담긴 항목도 모두 제거됩니다."
        : "해제(취소)된 이 묶음 기록을 완전히 삭제할까요? 되돌릴 수 없습니다.";
    if (!confirm(msg)) return;
    setActionError(null);
    const result = await callBatchApi("delete", { batch_id: batch.id });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await loadBatchFor(companyId, month);
    await refreshOverview();
  }

  // "최근 묶음" 목록에서 바로 삭제(현재 화면에 로드된 batch와 무관한 다른
  // 행일 수 있음) — 테스트 기록 정리 목적(PR #64 리뷰 피드백). 확정된
  // 묶음은 사유 입력이 필요해 별도로 force-delete API를 탄다(관리자 전용,
  // 아래 handleForceDelete와 동일한 경로).
  async function handleDeleteRecentBatch(batchId: string, batchStatus: string) {
    setActionError(null);
    if (batchStatus === "confirmed") {
      const reason = window.prompt(
        "확정된 묶음을 완전삭제합니다. 담긴 정산 건은 개별 정산(정산대기)으로 되돌아가고, 세금계산서·입금 처리 기록은 사라집니다. 삭제 사유를 입력해주세요:"
      );
      if (reason === null) return;
      if (!reason.trim()) {
        setActionError("삭제 사유를 입력해주세요.");
        return;
      }
      const result = await callBatchApi("force-delete", { batch_id: batchId, reason });
      if (!result.success) {
        setActionError(result.error || getBillingBatchReasonLabel(result.reason));
        return;
      }
    } else {
      if (!confirm("이 묶음 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
      const result = await callBatchApi("delete", { batch_id: batchId });
      if (!result.success) {
        setActionError(result.error || getBillingBatchReasonLabel(result.reason));
        return;
      }
    }
    if (batch?.id === batchId) {
      await loadBatchFor(companyId, month);
    }
    await refreshOverview();
  }

  // 확정 화면 안에서 바로 완전삭제(관리자 전용) — 정상 해제(release)는
  // 세금계산서 발행/입금 처리가 시작되면 막혀있는데, 테스트 중 만든 기록을
  // 정리할 수 있어야 한다는 실사용 피드백(PR #64)으로 추가.
  async function handleForceDelete() {
    if (!batch) return;
    if (!forceDeleteReason.trim()) {
      setActionError("삭제 사유를 입력해주세요.");
      return;
    }
    if (
      !confirm(
        "이 확정된 묶음을 완전삭제할까요? 담긴 정산 건은 개별 정산(정산대기)으로 되돌아가고, 세금계산서·입금 처리 기록은 사라집니다. 되돌릴 수 없습니다."
      )
    )
      return;
    setActionError(null);
    const result = await callBatchApi("force-delete", { batch_id: batch.id, reason: forceDeleteReason });
    if (!result.success) {
      setActionError(result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    setShowForceDeleteReason(false);
    setForceDeleteReason("");
    await loadBatchFor(companyId, month);
    await refreshOverview();
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
    await refreshOverview();
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
    await refreshOverview();
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
    await refreshOverview();
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
    await refreshOverview();
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
    await refreshOverview();
  }

  const activeTotal = activeItems.reduce((sum, i) => sum + (i.total_amount_snapshot || 0), 0);
  const activeSupply = activeItems.reduce((sum, i) => sum + (i.supply_amount_snapshot || 0), 0);
  const activeVat = activeItems.reduce((sum, i) => sum + (i.vat_amount_snapshot || 0), 0);
  const activeInvoiceIds = new Set(activeItems.map((i) => i.invoice_id));
  const availableCandidates = candidates.filter((c) => !activeInvoiceIds.has(c.invoice_id));

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 4 }}>
          전체 묶음 후보 ({allCandidates.length}건)
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, marginBottom: 12 }}>
          화주를 하나씩 찾아보지 않아도, 조건에 맞는(주선사 정산·월정산·정산대기) 정산 건이 전체
          화주 기준으로 여기 자동으로 표시됩니다. 원하는 건의 "선택"을 누르면 그 화주·정산월로
          바로 이동합니다.
        </p>
        {allCandidates.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>현재 묶을 수 있는 후보가 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>화주</th>
                <th>정산 기준일</th>
                <th>해당 정산월</th>
                <th>오더번호</th>
                <th>화주 청구금액</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allCandidates.map((c) => (
                <tr key={c.invoice_id}>
                  <td>{c.company_name}</td>
                  <td>{c.settlement_reference_date || "-"}</td>
                  <td>{c.cycle_month}</td>
                  <td>{c.order_no}</td>
                  <td>{won(c.customer_charge_total)}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: "4px 10px" }}
                      onClick={() => {
                        setSelectedCompany({ id: c.company_id, name: c.company_name });
                        setCompanyId(c.company_id);
                        setMonth(c.cycle_month !== "-" ? c.cycle_month : currentMonthInput());
                      }}
                    >
                      선택
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="form-grid" style={{ padding: 0, marginBottom: 6, maxWidth: 480 }}>
        <div className="field">
          <label>화주 검색</label>
          <input
            value={selectedCompany ? selectedCompany.name : companySearch}
            onChange={(e) => {
              setSelectedCompany(null);
              setCompanyId("");
              setCompanySearch(e.target.value);
            }}
            placeholder="회사명을 입력해서 검색"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label>정산월</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>
      {selectedCompany && month && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, marginBottom: 16 }}>
          실제 정산 기간:{" "}
          {(() => {
            const { period_start, period_end } = monthToPeriod(month, companyCutoffDay);
            return `${period_start} ~ ${period_end}`;
          })()}
          {companyCutoffDay
            ? ` (이 화주는 매달 ${companyCutoffDay}일 마감으로 설정되어 있습니다)`
            : " (정산 마감일 미설정 — 달력월 기준)"}
        </p>
      )}
      {!selectedCompany && companyResults.length > 0 && (
        <div className="card" style={{ maxWidth: 220, marginBottom: 16, maxHeight: 180, overflowY: "auto" }}>
          {companyResults.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setSelectedCompany(c);
                setCompanyId(c.id);
                setCompanyResults([]);
              }}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
      {!selectedCompany && <div style={{ marginBottom: 16 }} />}

      <details style={{ marginBottom: 16, fontSize: 12.5, color: "var(--text-muted)" }}>
        <summary style={{ cursor: "pointer" }}>묶음 후보가 되는 조건 보기</summary>
        <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>정산방식이 "주선사 정산 · 월정산"(수금방식 broker, 청구주기 monthly)인 건</li>
          <li>정산 상태가 "정산대기"인 건(이미 청구·입금 처리가 시작된 건은 제외)</li>
          <li>
            정산 기준일(등록 시 자동으로 오늘 날짜가 채워짐)이 위에서 고른 정산월의 실제 기간 안에
            있는 건 — 화주별 정산 마감일(화주 상세에서 설정)이 있으면 그 기준으로, 없으면 달력월
            (1일~말일) 기준으로 계산됩니다
          </li>
          <li>화주 청구금액이 확정되어 있고(0원·미입력 아님), 아직 다른 묶음에 포함되지 않은 건</li>
        </ul>
      </details>

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
                <button className="btn-danger" style={{ fontSize: 12.5, padding: "6px 10px" }} onClick={handleDeleteBatch}>
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
                          <td>
                            <Link href={`/admin/invoices/${it.invoice_id}`}>{orderNoByInvoiceId[it.invoice_id] || "-"}</Link>
                          </td>
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
                        <th>정산 기준일</th>
                        <th>화주 청구금액(공급가액)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableCandidates.map((c) => (
                        <tr key={c.invoice_id}>
                          <td>{orderNoByInvoiceId[c.invoice_id] || "-"}</td>
                          <td>{c.settlement_reference_date || "-"}</td>
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

              {candidates.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginBottom: 14 }}>
                  <p style={{ fontSize: 13, marginTop: 0 }}>
                    이 묶음이 확정된 뒤 새로 정산등록된 건이 {candidates.length}건 있습니다. 확정된
                    묶음에는 항목을 추가할 수 없으므로, 이 건들을 담을 <b>보충 묶음</b>을 같은 화주·
                    정산월로 새로 만들 수 있습니다.
                  </p>
                  <button className="btn" onClick={handleCreateBatch}>
                    보충 묶음 만들기
                  </button>
                </div>
              )}

              {isAdmin && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  {!showReleaseReason ? (
                    <button
                      className="btn-danger"
                      onClick={() => setShowReleaseReason(true)}
                      disabled={batch.tax_invoice_status === "issued" || batch.payment_status !== "unpaid"}
                    >
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

              {isAdmin && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
                  {!showForceDeleteReason ? (
                    <button className="btn-danger" onClick={() => setShowForceDeleteReason(true)}>
                      완전삭제(테스트 정리용)
                    </button>
                  ) : (
                    <div>
                      <div className="field" style={{ maxWidth: 400 }}>
                        <label>삭제 사유 *</label>
                        <input
                          type="text"
                          value={forceDeleteReason}
                          onChange={(e) => setForceDeleteReason(e.target.value)}
                          placeholder="삭제 사유를 입력해주세요"
                        />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <button className="btn-danger" onClick={handleForceDelete} style={{ marginRight: 8 }}>
                          완전삭제 확정
                        </button>
                        <button className="btn btn-ghost" onClick={() => setShowForceDeleteReason(false)}>
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
                    세금계산서 발행/입금 처리가 진행돼 위 "묶음 해제"가 막힌 경우에도 쓸 수 있는
                    관리자 전용 예외 경로입니다. 담긴 정산 건은 개별 정산(정산대기)으로 되돌아가고,
                    이 묶음의 세금계산서·입금 처리 기록은 사라집니다 — 되돌릴 수 없으니 테스트 데이터
                    정리 용도로만 사용해주세요.
                  </p>
                </div>
              )}
            </>
          )}

          {batch && batch.batch_status === "cancelled" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, margin: 0 }}>해제됨(취소)</h3>
                {isAdmin && (
                  <button className="btn-danger" style={{ fontSize: 12.5, padding: "6px 10px" }} onClick={handleDeleteBatch}>
                    기록 삭제
                  </button>
                )}
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>사유: {batch.cancel_reason || "-"}</p>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                해제 처리자: {batch.cancelled_by_name_snapshot || "-"}
              </p>
              <p style={{ fontSize: 13.5, marginTop: 12 }}>
                같은 화주·기간으로 새 묶음을 다시 만들 수 있습니다.
              </p>
              <button className="btn" onClick={handleCreateBatch} disabled={candidates.length === 0}>
                새 묶음 만들기
              </button>
              {candidates.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  묶을 수 있는 정산 건(주선사 정산·월정산, 정산대기 상태)이 없습니다.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 4 }}>최근 묶음 30건</h3>
        {recentBatches.length >= 30 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, marginBottom: 12 }}>
            최근 30건만 표시 중입니다. 더 오래된 묶음은 위에서 화주·정산월을 직접 선택해서 확인해주세요.
          </p>
        )}
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentBatches.map((b: any) => {
                const canDelete = b.batch_status === "draft" || isAdmin;
                return (
                  <tr key={b.id}>
                    <td
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedCompany({ id: b.company_id, name: b.companies?.name || "-" });
                        setCompanyId(b.company_id);
                        // 정산 마감일이 설정된 화주는 period_start가 전월에 걸쳐있어
                        // period_start 기준으로 월을 구하면 다른 주기로 계산되어
                        // 확정된 묶음을 못 찾는 버그가 있었음(PR #64 리뷰 피드백) —
                        // period_end의 날짜가 항상 그 주기의 라벨 월과 같으므로
                        // period_end 기준으로 구함
                        setMonth(String(b.period_end).slice(0, 7));
                      }}
                    >
                      {b.companies?.name || "-"}
                    </td>
                    <td>{b.period_start} ~ {b.period_end}</td>
                    <td>
                      {b.batch_status === "draft" ? "작성중" : b.batch_status === "confirmed" ? "확정" : "해제됨"}
                    </td>
                    <td>{b.tax_invoice_status === "issued" ? "발행완료" : "미발행"}</td>
                    <td>{b.payment_status === "paid" ? "완료" : b.payment_status === "overdue" ? "연체" : "대기"}</td>
                    <td>{won(b.total_amount)}</td>
                    <td>
                      {canDelete && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 11.5, padding: "4px 8px" }}
                          onClick={() => handleDeleteRecentBatch(b.id, b.batch_status)}
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
