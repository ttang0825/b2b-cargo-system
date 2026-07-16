"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,content,is_active,created_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("announcements").insert({
      title,
      content: content || null,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTitle("");
    setContent("");
    loadItems();
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    await supabase.from("announcements").update({ is_active: !isActive }).eq("id", id);
    loadItems();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 공지사항을 삭제하시겠습니까?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    loadItems();
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">공지사항 관리</h1>
          <p className="page-desc">화주포털에 표시할 공지사항을 등록합니다.</p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>내용</label>
            <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "등록 중..." : "공지 등록"}
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">등록된 공지사항이 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>등록일</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td className="cell-nowrap">
                    <span className="num">{new Date(a.created_at).toLocaleDateString("ko-KR")}</span>
                  </td>
                  <td className="cell-nowrap">
                    <span
                      className="badge"
                      style={a.is_active ? undefined : { background: "var(--danger-soft)", color: "var(--danger)" }}
                    >
                      {a.is_active ? "게시 중" : "숨김"}
                    </span>
                  </td>
                  <td className="cell-nowrap" style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn-ghost"
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                      onClick={() => handleToggleActive(a.id, a.is_active)}
                    >
                      {a.is_active ? "숨기기" : "다시 게시"}
                    </button>
                    <button
                      className="btn-danger"
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                      onClick={() => handleDelete(a.id)}
                    >
                      삭제
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
