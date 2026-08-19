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

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 발송시각은 칸을 좁히려고 날짜/시간을 두 줄로 나눠 보여준다 */
function formatDate(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}
function formatTime(value: string) {
  const d = new Date(value);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function formatDateTime(value: string) {
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** 목록에는 한 줄 미리보기만 — 전문은 팝업에서 본다 */
function previewOf(message: string | null): string {
  if (!message) return "";
  return message.replace(/\s+/g, " ").trim();
}

/** 여러 줄을 넘기면 말줄임 처리(오류 메시지가 옆 칸을 침범하지 않게) */
function clampStyle(lines: number): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
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
  // 문자 본문은 150~350byte 여러 줄이라 표 셀 안에 두면 칸이 세로로 길어지고 다른
  // 칸까지 눌린다(PR #85 리뷰) — 목록에는 한 줄 미리보기만 두고 전문은 팝업에서 본다
  const [detailLog, setDetailLog] = useState<SmsLog | null>(null);

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

  // 팝업은 ESC로도 닫히게(다른 모달들과 동일한 동작)
  useEffect(() => {
    if (!detailLog) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDetailLog(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailLog]);

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

  function MessagePreview({ log }: { log: SmsLog }) {
    if (!log.message_content) return <span style={{ color: "var(--text-muted)" }}>-</span>;
    return (
      <button
        type="button"
        onClick={() => setDetailLog(log)}
        title="클릭하면 전문을 봅니다"
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          font: "inherit",
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "inherit",
          ...clampStyle(2),
        }}
      >
        {previewOf(log.message_content)}
      </button>
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
          새로고침
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
                    {/* 칸 너비 합을 줄여서 "내용"이 실제로 넓게 쓰이도록 함(PR #85 리뷰).
                        발송시각은 날짜/시간 2줄, 보낸 번호·사람은 한 칸에 2줄로 합침 */}
                    <th style={{ width: 88 }}>발송시각</th>
                    <th style={{ width: 124 }}>종류</th>
                    <th style={{ width: 96 }}>상태</th>
                    <th style={{ width: 116 }}>받는 사람</th>
                    <th style={{ width: 116 }}>보낸 번호/사람</th>
                    <th>내용</th>
                    <th style={{ width: 76 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => {
                    const color: { bg?: string; text?: string } = SMS_STATUS_COLORS[log.status] || {};
                    return (
                      <tr key={log.id}>
                        <td className="cell-nowrap" style={{ verticalAlign: "top" }}>
                          <div className="num">{formatDate(log.sent_at)}</div>
                          <div className="num" style={{ color: "var(--text-muted)" }}>
                            {formatTime(log.sent_at)}
                          </div>
                        </td>
                        <td style={{ verticalAlign: "top", wordBreak: "keep-all" }}>
                          <div>{getSmsTemplateLabel(log.template_type)}</div>
                          {log.message_type && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{log.message_type}</div>
                          )}
                          {log.link && (
                            <Link href={log.link.href} style={{ fontSize: 11.5 }}>
                              {log.link.label} →
                            </Link>
                          )}
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          <span
                            className="badge"
                            style={{ background: color.bg, color: color.text, cursor: "help" }}
                            title={getSmsStatusHint(log.status)}
                          >
                            {getSmsStatusLabel(log.status)}
                          </span>
                          {/* 오류 메시지는 길면 옆 칸을 밀어내므로 2줄에서 자르고
                              전문은 마우스를 올리면 보이게 함 */}
                          {log.error_message && (
                            <div
                              title={log.error_message}
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                marginTop: 3,
                                lineHeight: 1.5,
                                ...clampStyle(2),
                              }}
                            >
                              {log.error_message}
                            </div>
                          )}
                        </td>
                        <td className="cell-nowrap" style={{ verticalAlign: "top" }}>
                          <span className="num">{log.recipient_phone || "번호 없음"}</span>
                        </td>
                        <td className="cell-nowrap" style={{ verticalAlign: "top" }}>
                          <div className="num">{formatPhone(log.sender_phone) || "기록 없음"}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                            {log.sent_by_name || "-"}
                          </div>
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          <MessagePreview log={log} />
                        </td>
                        <td className="cell-nowrap" style={{ verticalAlign: "top" }}>
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
                      <MessagePreview log={log} />
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

      {/* 문자 전문 팝업. 목록에서 미리보기를 누르면 열린다 */}
      {detailLog && (
        <div
          onClick={() => setDetailLog(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ padding: 20, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>
                {getSmsTemplateLabel(detailLog.template_type)}
                {detailLog.message_type && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>
                    {" "}
                    ({detailLog.message_type})
                  </span>
                )}
              </h3>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setDetailLog(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  lineHeight: 1,
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>

            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "76px 1fr",
                rowGap: 4,
                columnGap: 10,
                fontSize: 12.5,
                margin: "12px 0 0",
              }}
            >
              <dt style={{ color: "var(--text-muted)" }}>발송시각</dt>
              <dd style={{ margin: 0 }} className="num">
                {formatDateTime(detailLog.sent_at)}
              </dd>
              <dt style={{ color: "var(--text-muted)" }}>받는 사람</dt>
              <dd style={{ margin: 0 }} className="num">
                {detailLog.recipient_phone || "번호 없음"}
              </dd>
              <dt style={{ color: "var(--text-muted)" }}>보낸 번호</dt>
              <dd style={{ margin: 0 }} className="num">
                {formatPhone(detailLog.sender_phone) || "기록 없음"}
              </dd>
              <dt style={{ color: "var(--text-muted)" }}>보낸 사람</dt>
              <dd style={{ margin: 0 }}>{detailLog.sent_by_name || "-"}</dd>
              <dt style={{ color: "var(--text-muted)" }}>상태</dt>
              <dd style={{ margin: 0 }}>{getSmsStatusLabel(detailLog.status)}</dd>
              {detailLog.error_message && (
                <>
                  <dt style={{ color: "var(--text-muted)" }}>오류</dt>
                  <dd style={{ margin: 0 }}>{detailLog.error_message}</dd>
                </>
              )}
            </dl>

            {/* 실제로 나간 문구 그대로 — 줄바꿈을 살려서 보여준다 */}
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 8,
                background: "var(--bg-subtle, #f7f8f9)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 13,
                lineHeight: 1.75,
              }}
            >
              {detailLog.message_content}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              {detailLog.link && (
                <Link href={detailLog.link.href} className="btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }}>
                  {detailLog.link.label} →
                </Link>
              )}
              <button className="btn" onClick={() => setDetailLog(null)} style={{ padding: "7px 16px", fontSize: 12.5 }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
