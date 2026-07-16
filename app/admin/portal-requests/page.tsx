"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { generateDailyNumber } from "@/lib/generateNumber";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  대기중: { bg: "#fff1e2", text: "#d9730d" },
  승인됨: { bg: "#e6f7ec", text: "#1b9c57" },
  반려: { bg: "var(--danger-soft)", text: "var(--danger)" },
};

export default function PortalRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("대기중");

  async function loadRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from("portal_order_requests")
      .select(
        "id,company_id,origin,destination,vehicle_type,item,requested_pickup_at,notes,status,staff_note,created_at,companies(name)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    else setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleApprove(req: any) {
    setProcessingId(req.id);
    setError(null);

    const orderNo = await generateDailyNumber("orders", "O");

    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_no: orderNo,
        company_id: req.company_id,
        origin: req.origin,
        destination: req.destination,
        vehicle_type: req.vehicle_type || null,
        item: req.item || null,
        requested_pickup_at: req.requested_pickup_at || null,
        special_notes: req.notes || null,
        status: "접수",
      })
      .select("id")
      .single();

    if (orderError) {
      setProcessingId(null);
      setError(orderError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("portal_order_requests")
      .update({ status: "승인됨", order_id: newOrder.id })
      .eq("id", req.id);

    setProcessingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    loadRequests();
  }

  async function handleReject(req: any) {
    const reason = window.prompt("반려 사유를 입력해주세요 (화주에게 표시됩니다, 선택사항)");
    if (reason === null) return; // 취소
    setProcessingId(req.id);
    setError(null);
    const { error: updateError } = await supabase
      .from("portal_order_requests")
      .update({ status: "반려", staff_note: reason || null })
      .eq("id", req.id);
    setProcessingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    loadRequests();
  }

  const filtered = requests.filter((r) => filter === "전체" || r.status === filter);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">화주 발주 요청</h1>
          <p className="page-desc">
            화주포털에서 접수된 요청입니다. 승인하면 운송오더가 자동 생성됩니다.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["대기중", "승인됨", "반려", "전체"].map((s) => (
          <button
            key={s}
            className={filter === s ? "btn" : "btn btn-ghost"}
            style={{ fontSize: 12.5, padding: "7px 12px" }}
            onClick={() => setFilter(s)}
          >
            {s} ({s === "전체" ? requests.length : requests.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">해당하는 요청이 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>화주</th>
                <th>구간</th>
                <th>차량</th>
                <th>희망 상차일</th>
                <th>메모</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="cell-nowrap">
                    {r.companies?.name ? (
                      <a
                        href={`/admin/companies/${r.company_id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/admin/companies/${r.company_id}`);
                        }}
                        style={{ textDecoration: "underline" }}
                      >
                        {r.companies.name}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {r.origin} → {r.destination}
                  </td>
                  <td className="cell-nowrap">{r.vehicle_type || "-"}</td>
                  <td className="cell-nowrap">
                    <span className="num">
                      {r.requested_pickup_at
                        ? new Date(r.requested_pickup_at).toLocaleString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </span>
                  </td>
                  <td style={{ maxWidth: 200 }}>{r.notes || "-"}</td>
                  <td className="cell-nowrap">
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: (STATUS_COLORS[r.status] || {}).bg,
                        color: (STATUS_COLORS[r.status] || {}).text,
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="cell-nowrap">
                    {r.status === "대기중" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn"
                          style={{ padding: "5px 10px", fontSize: 11.5 }}
                          disabled={processingId === r.id}
                          onClick={() => handleApprove(r)}
                        >
                          승인(오더생성)
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          disabled={processingId === r.id}
                          onClick={() => handleReject(r)}
                        >
                          반려
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
