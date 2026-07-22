"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = ["검토중", "승인됨", "거절", "보류"];
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  검토중: { bg: "#fff1e2", text: "#d9730d" },
  승인됨: { bg: "#e6f7ec", text: "#1b9c57" },
  거절: { bg: "var(--danger-soft)", text: "var(--danger)" },
  보류: { bg: "#f2f4f6", text: "#8b95a1" },
};

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("검토중");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [issuedCredentials, setIssuedCredentials] = useState<{ email: string; password: string } | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "불러오기에 실패했습니다.");
        setLoading(false);
        return;
      }
      setItems(data.data || []);
    } catch {
      setError("불러오는 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleApprove(item: any) {
    let email = item.contact_email;
    if (!email) {
      const entered = window.prompt(
        "이 신청에는 담당자 이메일이 없습니다. 포털 계정 로그인용 이메일을 입력해주세요."
      );
      if (!entered) return;
      email = entered;
    }
    const processedBy = window.prompt("처리자 이름을 입력해주세요 (기록용)");
    if (processedBy === null) return;

    const confirmed = window.confirm(
      `"${item.company_name}"을(를) 승인하시겠습니까?\n화주 회사가 등록되고, ${email}로 포털 계정이 즉시 발급됩니다.`
    );
    if (!confirmed) return;

    setProcessingId(item.id);
    setError(null);
    setIssuedCredentials(null);
    try {
      const res = await fetch("/api/admin/approve-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: item.id, portal_email: email, processed_by: processedBy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "승인 처리에 실패했습니다.");
        setProcessingId(null);
        return;
      }
      setIssuedCredentials({ email: data.email, password: data.password });
      loadItems();
    } catch {
      setError("승인 처리 중 오류가 발생했습니다.");
    }
    setProcessingId(null);
  }

  async function handleStatusChange(item: any, status: "거절" | "보류") {
    const reason = window.prompt(`${status} 사유를 입력해주세요 (선택사항)`);
    if (reason === null) return;
    const processedBy = window.prompt("처리자 이름을 입력해주세요 (기록용)");
    if (processedBy === null) return;

    setProcessingId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status, staff_note: reason, processed_by: processedBy }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "처리에 실패했습니다.");
        setProcessingId(null);
        return;
      }
      loadItems();
    } catch {
      setError("처리 중 오류가 발생했습니다.");
    }
    setProcessingId(null);
  }

  const filtered = items.filter((i) => filter === "전체" || i.status === filter);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">화주 등록 신청</h1>
          <p className="page-desc">랜딩페이지·견적문의를 통해 접수된 정식 화주 등록 신청입니다.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["검토중", "승인됨", "거절", "보류", "전체"].map((s) => (
          <button
            key={s}
            className={filter === s ? "btn" : "btn btn-ghost"}
            style={{ fontSize: 12.5, padding: "7px 12px" }}
            onClick={() => setFilter(s)}
          >
            {s} ({s === "전체" ? items.length : items.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      {issuedCredentials && (
        <div
          className="card"
          style={{ padding: 16, marginBottom: 16, background: "var(--accent-soft)", border: "none" }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--accent)" }}>
            승인 완료 — 아래 정보를 화주에게 전달해주세요 (한 번만 표시됩니다)
          </div>
          <div>이메일: <span className="num">{issuedCredentials.email}</span></div>
          <div>임시 비밀번호: <span className="num">{issuedCredentials.password}</span></div>
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">해당하는 신청이 없습니다.</div>
        ) : (
          <table style={{ minWidth: 960 }}>
            <thead>
              <tr>
                <th>회사명</th>
                <th>담당자</th>
                <th>연락처</th>
                <th>구간</th>
                <th>월예상건수</th>
                <th>접수일</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="cell-nowrap">
                    {item.company_id ? (
                      <a
                        href={`/admin/companies/${item.company_id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/admin/companies/${item.company_id}`);
                        }}
                        style={{ textDecoration: "underline" }}
                      >
                        {item.company_name}
                      </a>
                    ) : (
                      item.company_name
                    )}
                  </td>
                  <td className="cell-nowrap">{item.contact_name}</td>
                  <td className="cell-nowrap">
                    <div className="num">{item.contact_phone}</div>
                    {item.contact_email && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.contact_email}</div>
                    )}
                  </td>
                  <td>
                    {item.main_origin || item.main_destination
                      ? `${item.main_origin || "-"} → ${item.main_destination || "-"}`
                      : "-"}
                  </td>
                  <td className="cell-nowrap">{item.monthly_volume_estimate || "-"}</td>
                  <td className="cell-nowrap">
                    <span className="num">{new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
                  </td>
                  <td className="cell-nowrap">
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: (STATUS_COLORS[item.status] || {}).bg,
                        color: (STATUS_COLORS[item.status] || {}).text,
                      }}
                    >
                      {item.status}
                    </span>
                    {item.staff_note && (
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3, maxWidth: 140 }}>
                        {item.staff_note}
                      </div>
                    )}
                  </td>
                  <td className="cell-nowrap">
                    {item.status === "검토중" && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 190 }}>
                        <button
                          className="btn"
                          style={{ padding: "5px 10px", fontSize: 11.5 }}
                          disabled={processingId === item.id}
                          onClick={() => handleApprove(item)}
                        >
                          승인
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          disabled={processingId === item.id}
                          onClick={() => handleStatusChange(item, "거절")}
                        >
                          거절
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          disabled={processingId === item.id}
                          onClick={() => handleStatusChange(item, "보류")}
                        >
                          보류
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
