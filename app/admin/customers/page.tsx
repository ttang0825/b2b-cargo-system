"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getStatusColor } from "@/lib/statusColors";

type Customer = {
  id: string;
  name: string;
  industry: string | null;
  sub_industry: string | null;
  metro_region: string | null;
  district: string | null;
  phone: string | null;
  status: string;
  grade: string | null;
  next_followup_date: string | null;
  contact_name: string | null;
  contact_mobile: string | null;
  payment_terms: string | null;
  total_orders_count: number | null;
  outstanding_amount: number | null;
};

// 견적요청 단계부터 "활성 관리 대상"으로 간주합니다.
const ACTIVE_CUSTOMER_STATUSES = [
  "견적요청",
  "견적발송",
  "첫거래완료",
  "재거래발생",
  "반복화주",
  "월정산화주",
];

function formatIndustry(c: Customer) {
  if (c.industry && c.sub_industry) return `${c.industry} / ${c.sub_industry}`;
  return c.industry || c.sub_industry || "-";
}

function formatRegion(c: Customer) {
  if (c.metro_region && c.district) return `${c.metro_region} ${c.district}`;
  return c.metro_region || c.district || "-";
}

function won(n: number | null) {
  if (!n) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadCustomers() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id,name,industry,sub_industry,metro_region,district,phone,status,grade,next_followup_date,contact_name,contact_mobile,payment_terms,total_orders_count,outstanding_amount"
      )
      .in("status", ACTIVE_CUSTOMER_STATUSES)
      .order("grade", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setCustomers(data as Customer[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // "삭제"가 아니라 활성 목록에서만 빠지도록 상태를 되돌립니다 (데이터는 보존됨)
  async function handleRemoveFromCRM(id: string, name: string) {
    const confirmed = window.confirm(
      `"${name}"을(를) 활성 화주 목록에서 제외하시겠습니까?\n` +
        `업체 정보는 삭제되지 않고, "화주 관리" 목록에는 계속 남아있습니다. (휴면화주로 전환)`
    );
    if (!confirmed) return;
    const { error } = await supabase
      .from("companies")
      .update({ status: "휴면화주" })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    loadCustomers();
  }

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.contact_name || "").toLowerCase().includes(q) ||
      formatRegion(c).toLowerCase().includes(q)
    );
  });

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">활성 화주 (거래 중인 고객)</h1>
          <p className="page-desc">
            견적요청 이상 단계에 진입한 화주만 모아 보여줍니다. 전체
            영업대상은{" "}
            <a href="/admin/companies" style={{ textDecoration: "underline" }}>
              화주 관리
            </a>{" "}
            화면에서 확인할 수 있습니다.
          </p>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="회사명, 담당자, 연락처, 지역으로 검색"
        style={{
          width: "100%",
          maxWidth: 360,
          marginBottom: 16,
          padding: "9px 12px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: 13.5,
        }}
      />

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            아직 활성 화주가 없습니다. 견적을 발송하거나, 화주 관리
            목록에서 "CRM 전환" 버튼을 눌러 등록할 수 있습니다.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>회사명</th>
                <th>업종/세부업종</th>
                <th>지역</th>
                <th>담당자</th>
                <th>연락처</th>
                <th>결제조건</th>
                <th>누적오더</th>
                <th>미수금</th>
                <th>등급</th>
                <th>거래상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/admin/companies/${c.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{c.name}</td>
                  <td>{formatIndustry(c)}</td>
                  <td>{formatRegion(c)}</td>
                  <td>{c.contact_name || "-"}</td>
                  <td>{c.contact_mobile || c.phone || "-"}</td>
                  <td>{c.payment_terms || "-"}</td>
                  <td>{c.total_orders_count || 0}건</td>
                  <td>{won(c.outstanding_amount)}</td>
                  <td>
                    {c.grade ? (
                      <span className="badge">{c.grade}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: getStatusColor(c.status).bg,
                        color: getStatusColor(c.status).text,
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-ghost"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11.5,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      onClick={() => handleRemoveFromCRM(c.id, c.name)}
                    >
                      제외
                    </button>
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
