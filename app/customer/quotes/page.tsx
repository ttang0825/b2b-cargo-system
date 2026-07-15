"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function won(n: number | null) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export default function CustomerQuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("quotes")
        .select(
          "id,quote_no,origin,destination,vehicle_type,final_amount,status,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      setQuotes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">견적 확인</h1>
          <p className="page-desc">받으신 견적 내역입니다. (부가세 별도)</p>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : quotes.length === 0 ? (
          <div className="empty-state">아직 받은 견적이 없습니다.</div>
        ) : (
          <table style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>견적번호</th>
                <th>구간</th>
                <th>차량</th>
                <th>금액</th>
                <th>상태</th>
                <th>일시</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td className="cell-nowrap">
                    <span className="num">{q.quote_no}</span>
                  </td>
                  <td>
                    {q.origin} → {q.destination}
                  </td>
                  <td className="cell-nowrap">{q.vehicle_type || "-"}</td>
                  <td className="cell-nowrap">
                    <span className="num">{won(q.final_amount)}</span>
                  </td>
                  <td className="cell-nowrap">{q.status}</td>
                  <td className="cell-nowrap">
                    <span className="num">
                      {new Date(q.created_at).toLocaleDateString("ko-KR")}
                    </span>
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
