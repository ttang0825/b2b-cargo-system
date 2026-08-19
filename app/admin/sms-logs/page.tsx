"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DateRangeFilter, { type DatePreset, getDateRange } from "@/components/DateRangeFilter";
import {
  SMS_TEMPLATE_LABELS,
  SMS_STATUS_LABELS,
  SMS_STATUS_COLORS,
  getSmsTemplateLabel,
  getSmsStatusLabel,
  getSmsStatusHint,
} from "@/lib/smsLogLabels";

// 문자 발송 이력 통합조회(관리자 전용).
//
// 지금까지는 배차·견적·화주·신청서 상세에 임베드된 SmsLogPanel로 **레코드별 조회만**
// 가능해서, "이번 달 나간 문자 전체"나 "특정 담당자가 보낸 전체"를 볼 방법이 없었다.
// 이 화면이 그 자리를 메운다(35차 PR #84 리뷰에서 사용자가 요청).
//
// ⚠️ 데이터는 반드시 서버 API를 거친다 — sms_logs는 개인 전화번호를 담고 있어
// anon/authenticated 조회 정책을 아예 두지 않았다(support_access_logs와 동일).

type SmsLog = {
  id: string;
  template_type: string;
  recipient_phone: string | null;
  recipient_type: string;
  message_type: string | null;
  message_content: string | null;
  sender_phone: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
  sent_by_name: string | null;
  link: { href: string; label: string } | null;
};

function formatDateTime(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

/** 저장은 숫자만 하므로 표시할 때만 하이픈을 붙인다 */
function formatPhone(value: string | null): string | null {
  if (!value) return null;
  const d = value.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) {
    return d.startsWith("02")
      ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
      : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return value;
}

export default function AdminSmsLogsPage() {
  const [items, setItems] = useState<SmsLog[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DatePreset>("month");
  const [templateType, setTemplateType] = useState("");
  const [status, setStatus] = useState("");
  const [sentBy, setSentBy] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const { from } = getDateRange(preset);
      if (from) params.set("from", from);
      if (templateType) params.set("template_type", templateType);
      if (status) params.set("status", status);
      if (sentBy) params.set("sent_by", sentBy);
      if (appliedSearch) params.set("q", appliedSearch);

      const res = await fetch(`/api/admin/sms-logs/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "불러오기에 실패했습니다.");
        setLoading(false);
        return;
      }
      setItems(data.data || []);
      setStaffOptions(data.staffOptions || []);
      setTotal(data.total || 0);
    } catch {
      setError("불러오는 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }, [preset, templateType, status, sentBy, appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  // 발송 결과는 자동으로 갱신되지 않는다(Webhook/폴링은 1차 범위 밖) — 여기서도
  // 상세 화면 패널과 똑같이 눌러서 최신 상태를 가져올 수 있게 함
  async function handleRefresh(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/sms-logs/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) setActionError(data.error || "상태 확인에 실패했습니다.");
      else await load();
    } catch {
      setActionError("상태 확인 중 오류가 발생했습니다.");
    }
    setBusyId(null);
  }

  async function handleResend(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/sms-logs/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) setActionError(data.error || "재발송에 실패했습니다.");
      else await load();
    } catch {
      setActionError("재발송 중 오류가 발생했습니다.");
    }
    setBusyId(null);
  }

  const selectStyle = { fontSize: 12.5, padding: "6px 8px" };
  const reachedLimit = total > items.length;

  function MessageDetails({ log }: { log: SmsLog }) {
    if (!log.message_content) return null;
    return (
      <details>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-muted)", userSelect: "none" }}>
          문자 내용 보기
        </summary>
        <div
          style={{
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--bg-subtle, #f7f8f9)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12.5,
            lineHeight: 1.7,
            maxWidth: 460,
          }}
        >
          {log.message_content}
        </div>
      </details>
    );
  }

  function ActionButtons({ log }: { log: SmsLog }) {
    if (log.status === "sent") {
      return (
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
          disabled={busyId === log.id}
          onClick={() => handleRefresh(log.id)}
        >
          상태 새로고침
        </button>
      );
    }
    if (log.status === "failed") {
      return (
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
          disabled={busyId === log.id}
          onClick={() => handleResend(log.id)}
        >
          재발송
        </button>
      );
    }
    return null;
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">문자 발송 이력</h1>
          <p className="page-desc">
            고객·차주에게 나간 문자를 한곳에서 확인합니다. 기간·종류·상태·담당자로 걸러볼 수 있습니다.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <DateRangeFilter value={preset} onChange={setPreset} />

          <select value={templateType} onChange={(e) => setTemplateType(e.target.value)} style={selectStyle}>
            <option value="">종류 전체</option>
            {Object.entries(SMS_TEMPLATE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
            <option value="">상태 전체</option>
            {Object.entries(SMS_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select value={sentBy} onChange={(e) => setSentBy(e.target.value)} style={selectStyle}>
            <option value="">담당자 전체</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedSearch(search.trim());
            }}
            style={{ display: "flex", gap: 6 }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="번호·문자 내용 검색"
              style={{ fontSize: 12.5, padding: "6px 10px", width: 190 }}
            />
            <button className="btn-ghost" type="submit" style={{ padding: "6px 12px", fontSize: 12 }}>
              검색
            </button>
          </form>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}
      {actionError && <div className="error-box" style={{ marginBottom: 12 }}>{actionError}</div>}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">조건에 맞는 발송 이력이 없습니다.</div>
        ) : (
          <>
            <div
              style={{
                padding: "12px 16px",
                fontSize: 12.5,
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {reachedLimit ? (
                <>
                  전체 {total.toLocaleString("ko-KR")}건 중 최근 {items.length.toLocaleString("ko-KR")}건만
                  보여줍니다. 기간·종류·담당자로 범위를 좁혀주세요.
                </>
              ) : (
                <>{items.length.toLocaleString("ko-KR")}건</>
              )}
            </div>

            <div className="table-scroll">
              <table className="desktop-only">
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>발송시각</th>
                    <th style={{ width: 130 }}>종류</th>
                    <th style={{ width: 120 }}>상태</th>
                    <th style={{ width: 130 }}>받는 사람</th>
                    <th style={{ width: 130 }}>보낸 번호</th>
                    <th style={{ width: 90 }}>보낸 사람</th>
                    <th>내용</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => {
                    const color: { bg?: string; text?: string } = SMS_STATUS_COLORS[log.status] || {};
                    return (
                      <tr key={log.id}>
                        <td className="cell-nowrap">
                          <span className="num">{formatDateTime(log.sent_at)}</span>
                        </td>
                        <td className="cell-nowrap">
                          {getSmsTemplateLabel(log.template_type)}
                          {log.message_type && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{log.message_type}</div>
                          )}
                        </td>
                        <td className="cell-nowrap">
                          <span
                            className="badge"
                            style={{ background: color.bg, color: color.text, cursor: "help" }}
                            title={getSmsStatusHint(log.status)}
                          >
                            {getSmsStatusLabel(log.status)}
                          </span>
                          {log.error_message && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, maxWidth: 200 }}>
                              {log.error_message}
                            </div>
                          )}
                        </td>
                        <td className="cell-nowrap">
                          <span className="num">{log.recipient_phone || "번호 없음"}</span>
                        </td>
                        <td className="cell-nowrap">
                          <span className="num">{formatPhone(log.sender_phone) || "기록 없음"}</span>
                        </td>
                        <td className="cell-nowrap">{log.sent_by_name || "-"}</td>
                        <td>
                          <MessageDetails log={log} />
                          {log.link && (
                            <div style={{ marginTop: 4 }}>
                              <Link href={log.link.href} style={{ fontSize: 12 }}>
                                {log.link.label} →
                              </Link>
                            </div>
                          )}
                        </td>
                        <td className="cell-nowrap">
                          <ActionButtons log={log} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 원칙 13번 — 데스크탑 표와 모바일 카드는 완전히 별개 JSX라 항목을 같이 챙길 것 */}
            <div className="mobile-only">
              {items.map((log) => {
                const color: { bg?: string; text?: string } = SMS_STATUS_COLORS[log.status] || {};
                return (
                  <div key={log.id} className="mobile-row-card">
                    <div className="mobile-row-top">
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{getSmsTemplateLabel(log.template_type)}</span>
                      <span
                        className="badge"
                        style={{ background: color.bg, color: color.text }}
                        title={getSmsStatusHint(log.status)}
                      >
                        {getSmsStatusLabel(log.status)}
                      </span>
                    </div>
                    <div className="mobile-row-line">
                      <span className="mobile-row-label">발송시각</span>
                      <span className="num">{formatDateTime(log.sent_at)}</span>
                    </div>
                    <div className="mobile-row-line">
                      <span className="mobile-row-label">받는 사람</span>
                      <span className="num">{log.recipient_phone || "번호 없음"}</span>
                    </div>
                    <div className="mobile-row-line">
                      <span className="mobile-row-label">보낸 번호</span>
                      <span className="num">{formatPhone(log.sender_phone) || "기록 없음"}</span>
                    </div>
                    <div className="mobile-row-line">
                      <span className="mobile-row-label">보낸 사람</span>
                      <span>{log.sent_by_name || "-"}</span>
                    </div>
                    {log.error_message && (
                      <div className="mobile-row-line">
                        <span className="mobile-row-label">오류</span>
                        <span>{log.error_message}</span>
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <MessageDetails log={log} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                      {log.link && (
                        <Link href={log.link.href} style={{ fontSize: 12 }}>
                          {log.link.label} →
                        </Link>
                      )}
                      <ActionButtons log={log} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
