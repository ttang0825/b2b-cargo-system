"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DateRangeFilter, { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import ApplicationDetailModal, { STATUS_COLORS, formatDate } from "@/components/ApplicationDetailModal";
import { notifyBadgeRefresh } from "@/lib/notifyBadgeRefresh";
import { getCurrentStaffRole } from "@/lib/currentStaff";

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("검토중");
  const [period, setPeriod] = useState<DatePreset>("all");
  const [cleaningUp, setCleaningUp] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  async function loadItems(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications");
      const data = await res.json();
      if (!res.ok) {
        if (!silent) setError(data.error || "불러오기에 실패했습니다.");
        setLoading(false);
        return;
      }
      setItems(data.data || []);
    } catch {
      if (!silent) setError("불러오는 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    const interval = setInterval(() => loadItems(true), 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleBulkCleanup() {
    if (!window.confirm("90일이 지난 '거절'/'보류' 상태 신청을 전부 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    setCleaningUp(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_cleanup", days: 90 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "일괄 정리에 실패했습니다.");
        setCleaningUp(false);
        return;
      }
      alert(`${data.deletedCount}건을 정리했습니다.`);
      loadItems();
    } catch {
      setError("일괄 정리 중 오류가 발생했습니다.");
    }
    setCleaningUp(false);
  }

  const periodFiltered = useMemo(() => {
    const { from } = getDateRange(period);
    if (!from) return items;
    return items.filter((i) => new Date(i.created_at) >= new Date(from));
  }, [items, period]);

  const filtered = periodFiltered.filter((i) => filter === "전체" || i.status === filter);

  // 같은 업체(이메일 또는 사업자등록번호 기준)의 이전 신청 이력이 있는 건에 "재신청" 표시
  const repeatIds = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const it of items) {
      const keys: string[] = [];
      if (it.contact_email) keys.push(`email:${it.contact_email}`);
      if (it.business_reg_no) keys.push(`biz:${it.business_reg_no}`);
      for (const key of keys) {
        (groups[key] = groups[key] || []).push(it);
      }
    }
    const result = new Set<string>();
    for (const key in groups) {
      const sorted = [...groups[key]].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      sorted.slice(1).forEach((it) => result.add(it.id));
    }
    return result;
  }, [items]);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">화주 등록 신청</h1>
          <p className="page-desc">
            랜딩페이지·견적문의를 통해 접수된 정식 화주 등록 신청입니다. 15초마다 자동 갱신됩니다.
            행을 클릭하면 상세 정보와 처리 버튼을 볼 수 있습니다.
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn-ghost"
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}
            onClick={handleBulkCleanup}
            disabled={cleaningUp}
          >
            {cleaningUp ? "정리 중..." : "오래된 거절·보류건 일괄정리"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["검토중", "승인됨", "거절", "보류", "전체"].map((s) => (
            <button
              key={s}
              className={filter === s ? "btn" : "btn btn-ghost"}
              style={{ fontSize: 12.5, padding: "7px 12px" }}
              onClick={() => setFilter(s)}
            >
              {s} ({s === "전체" ? periodFiltered.length : periodFiltered.filter((i) => i.status === s).length})
            </button>
          ))}
        </div>
        <DateRangeFilter value={period} onChange={setPeriod} />
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">해당하는 신청이 없습니다.</div>
        ) : (
          <>
            <table className="desktop-only">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>신청일</th>
                  <th>회사명</th>
                  <th>담당자</th>
                  <th>구간</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)} style={{ cursor: "pointer" }}>
                    <td className="cell-nowrap">
                      <span className="num">{item.created_at ? formatDate(item.created_at) : "-"}</span>
                    </td>
                    <td className="cell-nowrap" style={{ fontWeight: 700 }}>
                      {item.company_id ? (
                        <a
                          href={`/admin/companies/${item.company_id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/admin/companies/${item.company_id}`);
                          }}
                          style={{ textDecoration: "underline" }}
                        >
                          {item.company_name}
                        </a>
                      ) : (
                        item.company_name
                      )}
                      {repeatIds.has(item.id) && (
                        <span className="badge" style={{ marginLeft: 6, fontWeight: 600 }}>
                          재신청
                        </span>
                      )}
                    </td>
                    <td>
                      <div>{item.contact_name}</div>
                      <div className="num" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        {item.contact_phone}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "normal" }}>
                      <div>{item.main_origin || "-"}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        → {item.main_destination || "-"}
                      </div>
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
                    </td>
                    <td className="cell-nowrap">
                      <button
                        className="btn-ghost"
                        style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11.5, minWidth: 78, cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-only">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="mobile-row-card"
                  onClick={() => setSelectedItem(item)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="mobile-row-top">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {item.company_name}
                      {repeatIds.has(item.id) && (
                        <span className="badge" style={{ marginLeft: 6, fontWeight: 600 }}>
                          재신청
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: (STATUS_COLORS[item.status] || {}).bg,
                        color: (STATUS_COLORS[item.status] || {}).text,
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">담당자</span>
                    <span>
                      {item.contact_name} <span className="num">{item.contact_phone}</span>
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">구간</span>
                    <span>
                      {item.main_origin || "-"} → {item.main_destination || "-"}
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">신청일</span>
                    <span className="num">{item.created_at ? formatDate(item.created_at) : "-"}</span>
                  </div>
                  <button
                    className="btn-ghost"
                    style={{ marginTop: 8, padding: "6px 14px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}
                  >
                    상세보기
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedItem && (
        <ApplicationDetailModal
          item={selectedItem}
          allItems={items}
          onClose={() => setSelectedItem(null)}
          onChanged={() => {
            loadItems(true);
            notifyBadgeRefresh();
          }}
        />
      )}
    </main>
  );
}
