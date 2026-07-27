"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

export default function IndividualCustomersPage() {
  const router = useRouter();
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [stats, setStats] = useState<Record<string, { count: number; lastDate: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("individual_customers")
        .select("id,name,phone,email,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setItems(data || []);

      const ids = (data || []).map((d) => d.id);
      if (ids.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select("individual_customer_id,created_at")
          .in("individual_customer_id", ids);
        const map: Record<string, { count: number; lastDate: string | null }> = {};
        (orders || []).forEach((o: any) => {
          const key = o.individual_customer_id;
          if (!key) return;
          if (!map[key]) map[key] = { count: 0, lastDate: null };
          map[key].count += 1;
          if (!map[key].lastDate || o.created_at > map[key].lastDate) {
            map[key].lastDate = o.created_at;
          }
        });
        setStats(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = items.filter((i) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return i.name.toLowerCase().includes(q) || i.phone.includes(q);
  });

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">개인고객 관리</h1>
          <p className="page-desc">
            비회원(개인) 고객의 연락처를 기준으로 주문 이력을 누적 관리합니다.
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div style={{ maxWidth: 320, marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 연락처로 검색"
          style={{
            width: "100%",
            padding: "9px 12px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 13.5,
          }}
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">등록된 개인고객이 없습니다.</div>
        ) : (
          <>
            <table className="desktop-only">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>연락처</th>
                  <th>누적 주문건수</th>
                  <th>최근 이용일</th>
                  <th>최초 등록일</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/admin/individual-customers/${c.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{c.name}</td>
                    <td>
                      <span className="num">{c.phone}</span>
                    </td>
                    <td>
                      <span className="num">{stats[c.id]?.count || 0}건</span>
                    </td>
                    <td>
                      <span className="num">{formatDate(stats[c.id]?.lastDate || null)}</span>
                    </td>
                    <td>
                      <span className="num">{formatDate(c.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-only">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="mobile-row-card"
                  onClick={() => router.push(`/admin/individual-customers/${c.id}`)}
                >
                  <div className="mobile-row-top">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                    <span className="num" style={{ fontSize: 12 }}>
                      {stats[c.id]?.count || 0}건
                    </span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">연락처</span>
                    <span className="num">{c.phone}</span>
                  </div>
                  <div className="mobile-row-line">
                    <span className="mobile-row-label">최근 이용일</span>
                    <span className="num">{formatDate(stats[c.id]?.lastDate || null)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
