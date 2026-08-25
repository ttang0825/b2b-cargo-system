import { CONSENT_TYPE_LABELS, type ConsentRecord, type ConsentType } from "@/lib/consent";

// 관리자 상세 화면(신청 상세 모달·공개문의 상세 모달)에 동의 기록을 보여주는 공용 블록.
//
// ⚠️ 두 화면이 같은 모양으로 보여야 해서 컴포넌트로 뺐다 — 한쪽만 고쳐서 갈리지 않게.
// 🔴 `consents`는 anon으로 읽을 수 없다(RLS on + 정책 0개). 값은 각 화면의 서버 API
// (`/api/admin/public-quote-requests`·`/api/admin/applications`)가 원본 행에 붙여 내려준다.
//
// ⚠️ **14차 이전에 접수된 건에는 기록이 없다.** 그때는 체크박스를 눌러도 저장되지 않았기
// 때문이며, "동의하지 않았다"는 뜻이 아니다. 그래서 빈 경우의 문구를 따로 둔다.
export default function ConsentInfo({ consents }: { consents?: ConsentRecord[] | null }) {
  const rows = consents || [];

  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "5px 0", lineHeight: 1.6 }}>
        기록 없음 — 동의 저장 기능(14차) 이전에 접수된 건입니다.
      </div>
    );
  }

  // ⚠️ 라벨-값 2열(`DetailRow`)로 두지 않았다 — "개인정보 수집·이용"이 100px 라벨 칸에서
  // "수집·이 / 용"처럼 **어절 중간에서 끊긴다**(실측). 칸을 넓히면 위 DetailRow들과 좌측이
  // 어긋나므로, 한 줄로 흘려보내고 `word-break: keep-all`에 맡긴다.
  return (
    <div style={{ display: "grid", gap: 6, padding: "5px 0" }}>
      {rows.map((c) => (
        <div key={c.id} style={{ fontSize: 13, lineHeight: 1.6, wordBreak: "keep-all" }}>
          <span style={{ color: "var(--text-muted)" }}>
            {CONSENT_TYPE_LABELS[c.consent_type as ConsentType] || c.consent_type}
          </span>{" "}
          {/* 철회는 `agreed=false` 행이 추가되는 구조라 두 상태가 모두 나타날 수 있다 */}
          <span style={{ fontWeight: 700, color: c.agreed ? "var(--text)" : "var(--danger)" }}>
            {c.agreed ? "동의함" : "철회함"}
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            {" · "}
            {formatConsentTime(c.agreed_at)}
            {" · "}
            {c.version}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatConsentTime(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
