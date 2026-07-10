"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const STATUS_OPTIONS = ["상담중", "견적제출", "수주", "보류", "실패"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  상담중: { bg: "#EFF6FF", text: "#3B82F6" },
  견적제출: { bg: "#EDE9FE", text: "#7C3AED" },
  수주: { bg: "#D1FAE5", text: "#059669" },
  보류: { bg: "#FEF3C7", text: "#B45309" },
  실패: { bg: "#FEE2E2", text: "#B91C1C" },
};

type QuoteItem = { id: string; item_name: string | null; amount: number | null };

type QuoteDetail = {
  id: string;
  quote_no: string | null;
  origin: string | null;
  destination: string | null;
  distance_km: number | null;
  vehicle_type: string | null;
  item: string | null;
  base_fare: number | null;
  surcharge_amount: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  status: string;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  company_id: string | null;
  selected_options: Record<string, any> | null;
  companies: { id: string; name: string; phone: string | null } | null;
};

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select(
        "*, companies(id,name,phone)"
      )
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setQuote(data as any);

    const { data: itemData } = await supabase
      .from("quote_items")
      .select("id,item_name,amount")
      .eq("quote_id", id);
    setItems(itemData || []);
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(status: string) {
    const { error } = await supabase
      .from("quotes")
      .update({ status })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setQuote((q) => (q ? { ...q, status } : q));
  }

  async function handleDelete() {
    if (!quote) return;
    const confirmed = window.confirm(
      `견적 "${quote.quote_no}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;
    setDeleting(true);
    await supabase.from("quote_items").delete().eq("quote_id", id);
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      setError(error.message);
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
      </div>

      {error && <div className="error-box">오류: {error}</div>}

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
        </div>

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
      </div>

      {quote.selected_options && (
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

      <div className="card" style={{ padding: 20 }}>
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
          <span>{won(quote.base_fare)}</span>
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
            <span>+ {it.item_name}</span>
            <span>{won(it.amount)}</span>
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
          <span>{won(quote.final_amount)}</span>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
          부가세 별도
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 20, opacity: 0.6 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 6 }}>
          견적서 출력 · 화주포털 공유
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
          다음 단계에서 이 화면에 PDF 견적서 다운로드, 화주포털 노출 기능이
          추가될 예정입니다.
        </p>
      </div>
    </main>
  );
}
