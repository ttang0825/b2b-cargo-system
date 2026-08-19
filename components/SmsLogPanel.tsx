"use client";

import { useEffect, useState } from "react";
import { getSmsTemplateLabel, getSmsStatusLabel, getSmsStatusHint, SMS_STATUS_COLORS } from "@/lib/smsLogLabels";

type SmsLog = {
  id: string;
  template_type: string;
  recipient_phone: string | null;
  recipient_type: string;
  message_type: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
  result_checked_at: string | null;
  /** 실제로 나간 문자 내용 — 발송 직전 모달에서 수정했다면 수정된 문구가 남는다 */
  message_content: string | null;
  /** 실제로 사용된 발신번호(숫자만). 35차 이전 로그에는 없음 */
  sender_phone: string | null;
  /** 보낸 담당자 이름 — API가 sent_by(uuid)를 이름으로 바꿔서 내려줌 */
  sent_by_name: string | null;
};

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

function formatDateTime(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SmsLogPanel({
  relatedType,
  relatedId,
  relatedIds,
  title = "문자 발송 이력",
}: {
  relatedType: "dispatch" | "application" | "portal_account" | "quote";
  relatedId?: string;
  relatedIds?: string[];
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const idParam = relatedIds && relatedIds.length > 0 ? `related_ids=${relatedIds.join(",")}` : `related_id=${relatedId}`;
    if (!relatedId && (!relatedIds || relatedIds.length === 0)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sms-logs?related_type=${relatedType}&${idParam}`);
      const data = await res.json();
      if (res.ok) setLogs(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedType, relatedId, (relatedIds || []).join(",")]);

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
      if (!res.ok) {
        setActionError(data.error || "재발송에 실패했습니다.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

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
      if (!res.ok) {
        setActionError(data.error || "상태 새로고침에 실패했습니다.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
        }}
      >
        <h3 style={{ fontSize: 14, margin: 0 }}>{title}</h3>
        {logs.length > 0 && (
          <span className="badge" style={{ fontSize: 11 }}>
            {logs.length}건
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
          {open ? "▲ 접기" : "▼ 펼치기"}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {actionError && <div className="error-box" style={{ marginBottom: 10 }}>{actionError}</div>}
          {loading ? (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>불러오는 중...</p>
          ) : logs.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>발송 이력이 없습니다.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {logs.map((log) => {
                const color: { bg?: string; text?: string } = SMS_STATUS_COLORS[log.status] || {};
                return (
                  <div
                    key={log.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 12.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {getSmsTemplateLabel(log.template_type)}
                        {log.message_type && (
                          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> ({log.message_type})</span>
                        )}
                      </div>
                      <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                        {formatDateTime(log.sent_at)} · 받는 사람 {log.recipient_phone || "번호 없음"}
                      </div>
                      <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                        보낸 번호 {formatPhone(log.sender_phone) || "기록 없음"}
                        {log.sent_by_name ? ` · 보낸 사람 ${log.sent_by_name}` : ""}
                      </div>
                      {log.error_message && (
                        <div style={{ color: "var(--text-muted)", marginTop: 2 }}>{log.error_message}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        className="badge"
                        style={{ background: color.bg, color: color.text, cursor: "help" }}
                        title={getSmsStatusHint(log.status)}
                      >
                        {getSmsStatusLabel(log.status)}
                      </span>
                      {log.status === "sent" && (
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          disabled={busyId === log.id}
                          onClick={() => handleRefresh(log.id)}
                        >
                          상태 새로고침
                        </button>
                      )}
                      {log.status === "failed" && (
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                          disabled={busyId === log.id}
                          onClick={() => handleResend(log.id)}
                        >
                          재발송
                        </button>
                      )}
                    </div>

                    {/* 실제로 나간 문자 내용. 목록이 길어지지 않게 기본은 접어둔다 */}
                    {log.message_content && (
                      <details style={{ flexBasis: "100%" }}>
                        <summary
                          style={{
                            cursor: "pointer",
                            fontSize: 12,
                            color: "var(--text-muted)",
                            userSelect: "none",
                          }}
                        >
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
                          }}
                        >
                          {log.message_content}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
