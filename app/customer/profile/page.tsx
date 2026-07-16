"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { formatPhoneNumber } from "@/lib/constants";

export default function PortalProfilePage() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    contact_name: "",
    contact_position: "",
    contact_mobile: "",
    contact_email: "",
  });

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const { data: account } = await supabase
        .from("customer_accounts")
        .select("company_id")
        .eq("auth_user_id", session.user.id)
        .single();
      if (account) {
        const { data: company } = await supabase
          .from("companies")
          .select("name,contact_name,contact_position,contact_mobile,contact_email")
          .eq("id", account.company_id)
          .single();
        if (company) {
          setCompanyName(company.name || "");
          setForm({
            contact_name: company.contact_name || "",
            contact_position: company.contact_position || "",
            contact_mobile: company.contact_mobile || "",
            contact_email: company.contact_email || "",
          });
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      setError("로그인이 만료되었습니다. 다시 로그인해주세요.");
      return;
    }

    const res = await fetch("/api/customer/update-contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "저장에 실패했습니다.");
      return;
    }
    setSuccess(true);
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="container" style={{ maxWidth: 520 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">내 정보</h1>
          <p className="page-desc">{companyName} 담당자 연락처를 직접 관리할 수 있습니다.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>담당자명</label>
            <input value={form.contact_name} onChange={(e) => setField("contact_name", e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>직책</label>
            <input value={form.contact_position} onChange={(e) => setField("contact_position", e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>휴대폰</label>
            <input
              value={form.contact_mobile}
              onChange={(e) => setField("contact_mobile", formatPhoneNumber(e.target.value))}
              placeholder="숫자만 입력하면 자동으로 - 표시"
            />
          </div>
          <div className="field" style={{ marginBottom: 18 }}>
            <label>이메일</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => setField("contact_email", e.target.value)}
            />
          </div>
          {error && <div className="error-box">{error}</div>}
          {success && (
            <div
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 14,
              }}
            >
              저장되었습니다.
            </div>
          )}
          <button className="btn" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </form>
      </div>
    </main>
  );
}
