"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { formatPhoneNumber } from "@/lib/constants";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14.5 }}>{value || "-"}</div>
    </div>
  );
}

export default function PortalProfilePage() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saved, setSaved] = useState({
    name: "",
    contact_position: "",
    contact_mobile: "",
    email: "",
  });
  const [form, setForm] = useState({
    name: "",
    contact_position: "",
    contact_mobile: "",
    email: "",
  });

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
      .select("name,contact_position,contact_mobile,email,companies(name)")
      .eq("auth_user_id", session.user.id)
      .single();
    if (account) {
      setCompanyName((account.companies as any)?.name || "");
      const values = {
        name: account.name || "",
        contact_position: account.contact_position || "",
        contact_mobile: account.contact_mobile || "",
        email: account.email || "",
      };
      setSaved(values);
      setForm(values);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

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
    setSaved(form);
    setEditing(false);
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
          <h1 className="page-title">담당자 정보</h1>
          <p className="page-desc">
            {companyName} · 이 계정으로 로그인한 담당자 본인의 정보입니다. 같은 회사의 다른
            담당자 계정에는 영향을 주지 않습니다.
          </p>
        </div>
        {!editing && (
          <button className="btn" onClick={() => setEditing(true)}>
            수정
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 24 }}>
        {!editing ? (
          <>
            <Field label="담당자명" value={saved.name} />
            <Field label="직책" value={saved.contact_position} />
            <Field label="휴대폰" value={saved.contact_mobile} />
            <Field label="이메일" value={saved.email} />
          </>
        ) : (
          <form onSubmit={handleSave}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>담당자명</label>
              <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
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
              <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </div>
            {error && <div className="error-box">{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setForm(saved);
                  setEditing(false);
                  setError(null);
                }}
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
