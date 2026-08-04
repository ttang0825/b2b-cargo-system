"use client";

import { useEffect, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { DISPATCH_PHOTO_CATEGORIES, getDispatchPhotoCategoryLabel } from "@/lib/dispatchPhotos";

// 로드맵④ POD·인수증 — 화주포털 목록 펼침 방식(11차 세션 검색·정렬과 같은
// 결의 UI). 배차·운송조회 목록에서 행을 펼치면 이 패널이 사진을 불러온다.
// storage_path는 절대 프론트에 내려오지 않고, photo_id로만 signed URL을 받는다.
export default function DispatchPhotosPanel({ dispatchId }: { dispatchId: string }) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Record<string, any[]>>({ dropoff: [], pod: [] });
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        if (active) {
          setError("로그인이 만료되었습니다. 다시 로그인해주세요.");
          setLoading(false);
        }
        return;
      }
      const res = await fetch("/api/customer/dispatch-photos/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ dispatch_id: dispatchId }),
      });
      const data = await res.json();
      if (!active) return;
      if (!res.ok) {
        setError("사진을 불러오지 못했습니다.");
        setLoading(false);
        return;
      }
      const list: any[] = data.photos || [];
      setPhotos({
        dropoff: list.filter((p) => p.category === "dropoff"),
        pod: list.filter((p) => p.category === "pod"),
      });
      // list API가 미리보기 가능한 형식의 썸네일 signed URL을 batch로 함께
      // 내려줘서, 사진마다 signed-url을 따로 호출할 필요가 없음(PR #66
      // 리뷰 — 화주포털 사진 로딩이 느리다는 피드백 반영)
      const urls: Record<string, string> = {};
      list.forEach((p) => {
        if (p.preview_url) urls[p.id] = p.preview_url;
      });
      if (active) setPreviewUrls(urls);
      if (active) setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [dispatchId]);

  async function handleView(photoId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/customer/dispatch-photos/signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ photo_id: photoId }),
    });
    const data = await res.json();
    if (res.ok && data.url) window.open(data.url, "_blank");
  }

  if (loading) {
    return <p style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "8px 0" }}>사진 불러오는 중...</p>;
  }
  if (error) {
    return <p style={{ fontSize: 12.5, color: "var(--danger)", padding: "8px 0" }}>{error}</p>;
  }

  const totalCount = photos.dropoff.length + photos.pod.length;
  if (totalCount === 0) {
    return <p style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "8px 0" }}>등록된 사진이 없습니다.</p>;
  }

  return (
    <div style={{ padding: "8px 0" }}>
      {DISPATCH_PHOTO_CATEGORIES.map((category) =>
        photos[category].length === 0 ? null : (
          <div key={category} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
              {getDispatchPhotoCategoryLabel(category)} ({photos[category].length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {photos[category].map((p) => (
                <div
                  key={p.id}
                  onClick={() => (previewUrls[p.id] ? setViewingUrl(previewUrls[p.id]) : handleView(p.id))}
                  style={{
                    width: 88,
                    cursor: "pointer",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 4,
                    fontSize: 10.5,
                    textAlign: "center",
                  }}
                >
                  {previewUrls[p.id] ? (
                    <img
                      src={previewUrls[p.id]}
                      alt={p.original_filename || ""}
                      style={{ width: "100%", height: 66, objectFit: "cover", borderRadius: 4 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 66,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--bg-subtle, #f4f5f7)",
                        borderRadius: 4,
                        fontSize: 20,
                      }}
                    >
                      📄
                    </div>
                  )}
                  <div
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: 3,
                    }}
                    title={p.original_filename || ""}
                  >
                    {p.original_filename || "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {viewingUrl && (
        <div
          onClick={() => setViewingUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <button
            type="button"
            onClick={() => setViewingUrl(null)}
            aria-label="닫기"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
          <img
            src={viewingUrl}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 6 }}
          />
        </div>
      )}
    </div>
  );
}
