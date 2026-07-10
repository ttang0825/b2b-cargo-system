"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Customer = {
  id: string;
  name: string;
  industry: string | null;
  phone: string | null;
  status: string;
  grade: string | null;
  next_followup_date: string | null;
  contact_department: string | null;
};

// 실거래가 발생한 것으로 간주하는 상태값
const ACTIVE_CUSTOMER_STATUSES = [
  "첫거래완료",
  "재거래발생",
  "반복화주",
  "월정산화주",
];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCustomers() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id,name,industry,phone,status,grade,next_followup_date,contact_department"
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

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">활성 화주 (거래 중인 고객)</h1>
          <p className="page-desc">
            첫거래완료 이상 단계에 진입한 실제 거래 화주만 모아 보여줍니다.
            영업대상 전체 목록은{" "}
            <a href="/admin/companies" style={{ textDecoration: "underline" }}>
              화주 관리
            </a>{" "}
            화면에서 확인할 수 있습니다.
          </p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            아직 첫거래를 완료한 화주가 없습니다. 영업대상 목록에서 영업상태를
            "첫거래완료"로 변경하면 이 화면에 나타납니다.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>회사명</th>
                <th>업종</th>
                <th>대표번호</th>
                <th>담당부서</th>
                <th>등급</th>
                <th>거래상태</th>
                <th>다음 연락 예정일</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/admin/companies/${c.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{c.name}</td>
                  <td>{c.industry || "-"}</td>
                  <td>{c.phone || "-"}</td>
                  <td>{c.contact_department || "-"}</td>
                  <td>
                    {c.grade ? (
                      <span className="badge">{c.grade}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{c.status}</td>
                  <td>{c.next_followup_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
