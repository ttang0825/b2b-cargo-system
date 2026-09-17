"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentStaffRole } from "@/lib/currentStaff";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import AnnouncementEditor from "@/components/AnnouncementEditor";
import {
  ANNOUNCEMENT_FORMAT_DEFAULT,
  isBlankAnnouncementContent,
} from "@/lib/announcementMarkup";

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // 🔴 **원칙 33번** — 화면을 통째로 덮는 「불러오기 실패」와, 저장이 실패했을 때의
  //    오류를 **다른 state 로 나눈다.** 하나로 두면 저장 한 번 실패했을 때 방금
  //    쓰던 본문이 오류 화면으로 덮여 사라진다(이 저장소에서 네 번 난 사고).
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // 🔴 `null` 이면 새 공지, 값이 있으면 그 공지를 고치는 중이다.
  //    **같은 폼을 쓰되 어느 쪽인지 화면에 분명히 보여야 한다** — 안 그러면
  //    수정하려다 새 공지를 하나 더 만든다.
  const [editingId, setEditingId] = useState<string | null>(null);
  // 🔴 「화주에게 다시 알림」 — **기본 꺼짐**(사용자 확정). 켤 때만 `announced_at` 을
  //    지금으로 민다. 끄면 **손대지 않는다**(오타 하나 고쳤다고 전 화주에게 새 공지로
  //    뜨면 안 된다).
  const [renotify, setRenotify] = useState(false);

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  async function loadItems() {
    setLoading(true);
    // 🔴 `content_format` 을 빼지 말 것 — 없으면 옛 평문 공지를 서식으로 읽어
    //    줄바꿈이 통째로 사라진다.
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,content,content_format,is_active,created_at,updated_at,announced_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else {
      setError(null);
      setItems(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setRenotify(false);
    setSaveError(null);
  }

  function startEdit(a: any) {
    // 🔴 고치던 것이 있으면 한 번 물어본다 — 말없이 덮어쓰면 쓰던 글이 사라진다.
    const dirty = title.trim() !== "" || content.trim() !== "";
    if (dirty && !window.confirm("지금 작성 중인 내용이 사라집니다. 계속할까요?")) return;
    setEditingId(a.id);
    setTitle(a.title || "");
    setContent(a.content || "");
    setRenotify(false);
    setSaveError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setSaveError("제목을 입력해주세요.");
      return;
    }
    setSaving(true);
    setSaveError(null);

    // 🔴 공백만 남은 본문은 `null` 로 저장한다 — 안 그러면 화주 화면의
    //    "내용 없음" 처리가 영영 안 걸린다.
    const body = isBlankAnnouncementContent(content) ? null : content;

    // 🔴 새로 저장하는 본문은 전부 간이 서식이다. 옛 행(`plain`)을 수정하면 여기서
    //    `markup` 으로 바뀌는데, 줄바꿈은 그대로 살아나므로(문단·`<br />` 처리)
    //    모양이 달라지지 않는다 — **미리보기로 확인하고 저장하면 된다.**
    const payload: Record<string, any> = {
      title,
      content: body,
      content_format: ANNOUNCEMENT_FORMAT_DEFAULT,
    };

    let err: { message: string } | null = null;
    if (editingId) {
      // 🔴 켰을 때만 민다. 끄면 이 칸을 **건드리지 않는다.**
      if (renotify) payload.announced_at = new Date().toISOString();
      const res = await supabase.from("announcements").update(payload).eq("id", editingId);
      err = res.error;
    } else {
      payload.is_active = true;
      payload.announced_at = new Date().toISOString();
      const res = await supabase.from("announcements").insert(payload);
      err = res.error;
    }

    setSaving(false);
    if (err) {
      // 🔴 **폼을 비우거나 닫지 않는다** — 쓰던 내용을 그대로 두고 오류만 보여준다.
      setSaveError(err.message);
      return;
    }
    resetForm();
    loadItems();
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    // 🔴 게시/숨김 토글은 `announced_at` 을 건드리지 않는다 — 다시 게시한다고
    //    모든 화주에게 새 공지로 뜨면 안 된다.
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !isActive })
      .eq("id", id);
    if (error) {
      setActionError(error.message);
      return;
    }
    setActionError(null);
    loadItems();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 공지사항을 삭제하시겠습니까?")) return;
    const res = await fetch("/api/admin/delete-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "announcements", id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error || "삭제에 실패했습니다.");
      return;
    }
    setActionError(null);
    // 지우던 것을 고치고 있었다면 폼도 같이 비운다.
    if (editingId === id) resetForm();
    loadItems();
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">공지사항 관리</h1>
          <p className="page-desc">화주포털에 표시할 공지사항을 등록·수정합니다.</p>
        </div>
      </div>

      {error && <div className="error-box">오류: {error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
          {/* 🔴 새 글인지 수정인지 한눈에 보여야 한다 — 제목 줄과 버튼 글자 둘 다. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 14.5, fontWeight: 800 }}>
              {editingId ? "공지 수정" : "새 공지 등록"}
            </span>
            {editingId && (
              <button type="button" className="btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={resetForm}>
                수정 취소
              </button>
            )}
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label>내용</label>
            <AnnouncementEditor value={content} onChange={setContent} title={title} />
          </div>

          {editingId && (
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 14,
                fontSize: 12.5,
                lineHeight: 1.6,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={renotify}
                onChange={(e) => setRenotify(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span>
                화주에게 다시 알림
                <br />
                <span style={{ color: "var(--text-muted)" }}>
                  켜면 이 공지가 화주 화면에 「새 공지」로 다시 표시됩니다. 오타 수정처럼 작은
                  변경이면 꺼 두십시오.
                </span>
              </span>
            </label>
          )}

          {/* 🔴 오류는 **누른 자리 바로 위**에 띄운다(원칙 33번) — 맨 위에만 그리면
              본문 칸이 360px 이라 버튼에서 한참 떨어져 "아무 일도 안 일어난다" 가 된다. */}
          {saveError && (
            <div className="error-box" style={{ marginBottom: 10 }}>
              저장하지 못했습니다: {saveError}
            </div>
          )}

          <button className="btn" type="submit" disabled={saving}>
            {saving ? "저장 중..." : editingId ? "수정 저장" : "공지 등록"}
          </button>
        </form>
      </div>

      {actionError && <div className="error-box">오류: {actionError}</div>}

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
                <tr key={a.id} style={editingId === a.id ? { background: "var(--admin-row-attention)" } : undefined}>
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
                      onClick={() => startEdit(a)}
                    >
                      수정
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                      onClick={() => handleToggleActive(a.id, a.is_active)}
                    >
                      {a.is_active ? "숨기기" : "다시 게시"}
                    </button>
                    {isAdmin && (
                      <button
                        className="btn-danger"
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                        onClick={() => handleDelete(a.id)}
                      >
                        삭제
                      </button>
                    )}
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
