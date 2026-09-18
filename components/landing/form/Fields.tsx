"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* 공개 폼 3화면(`/quote` · `/apply` · `/customer/login`) 공용 컨트롤 — 31차.
   시안(디자인팀 Next 변환본)의 `components/landing/form/Fields.tsx` 를 옮긴 것이다.

   🔴 **네이티브 `<select>`·`<input type="date">` 를 쓰지 않는다**(원칙 57번). 펼친 목록과
      달력은 브라우저·OS 가 그려서 항목 높이·모서리·hover 색을 CSS 로 바꿀 수 없다.
   🔴 **`components/pv2/` 부품을 가져다 쓰지 않는다** — 저쪽은 `--pv2-*` 변수 33개가
      `.portal-v2` 안에서만 정의돼 색·배경이 통째로 무효가 된다(28차 §7-2).
   🔴 **접근성을 직접 넣었다 — 지우지 말 것.** 네이티브를 버리면 브라우저가 주던 키보드
      조작이 사라진다(`role="listbox"` · `aria-expanded` · ↑↓ · Enter · Esc · Home · End).
   🔴 **열림은 화면 전체에서 하나뿐이다**(`useOpenKey`) — 드롭다운과 달력이 같은 레지스트리를
      써야 한다. 따로 두면 달력을 여는 순간 드롭다운이 열린 채 남아 겹친다(26차와 같은 이유). */

const trigger = (hasValue: boolean, pad: string): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  padding: pad,
  border: "1px solid #EBEAE7",
  borderRadius: 12,
  // 🔴 입력칸 배경은 흰색이 아니라 **#FAFAF8** 이다(시안 실측 — 31차 리뷰에 사용자가
  //    "항목칸 컬러"가 다르다고 신고). 카드가 흰색(#FFFFFF)이라 칸이 흰색이면 경계가
  //    사라진다. `#F4F3EF` 위에 올릴 때만 `fieldOnTintStyle` 로 흰색을 쓴다.
  background: "#FAFAF8",
  fontSize: 15,
  textAlign: "left",
  cursor: "pointer",
  color: hasValue ? "#1A1A1A" : "#888378",
  fontFamily: "inherit",
});

const menu: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: 4,
  zIndex: 10,
  maxHeight: 240,
  overflowY: "auto",
  padding: "6px 0",
  background: "#FFFFFF",
  border: "1px solid #EBEAE7",
  borderRadius: 14,
  boxShadow: "0 4px 12px rgba(26,26,26,0.08)",
};

const menuItem = (active: boolean, selected: boolean): CSSProperties => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  border: "none",
  background: active ? "#FAF9F5" : "none",
  padding: "9px 14px",
  fontSize: 14.5,
  fontWeight: selected ? 700 : 400,
  color: "#1A1A1A",
  cursor: "pointer",
  fontFamily: "inherit",
});

/**
 * 폼 라벨. 시안 값 그대로다(데스크탑 14px · 600 · `#6B6759`).
 *
 * 🔴 **쓸 때 `className="landing-field-label"` 를 같이 달 것.** 값이 인라인 style 이라
 *    CSS 로는 못 이기는데, 좁은 화면에서 이 라벨만 키우려면 손잡이가 필요하다
 *    (사용자 지시 2026-09-18 PR #177 리뷰 — *「모바일버전에서 계정신청이나 견적문의에서
 *    적어야 하는 항목 제목들은 좀더 잘보이게 글자톤을 좀더 진하게 하고 글자크기를
 *    살짝 더 키우자」*). 값은 `app/landing.css` 의 ≤700px 블록에 있다.
 * 🔴 **동의 카드(`.landing-consent`)는 이 손잡이를 달지 않는다** — 그쪽은 제목이
 *    별도 크기(14.5px · 600)이고 이 규칙이 걸리면 두 배로 커진다.
 */
export const fieldLabel: CSSProperties = { display: "block", fontSize: 14, fontWeight: 600, color: "#6B6759" };

/** 필수 항목 표시. 라벨 뒤에 `{" "}` 와 함께 놓는다 — `<label>회사명 {requiredMark}</label>`
 *
 *  🔴 **빨간 `*` 다**(39차 A장 리뷰 — 사용자 지시 *"필수항목은 🔴 빨간 * 으로 표시하자"*).
 *     ⚠️ **31차 리뷰가 확정했던 회색 「필수」 글자를 뒤집은 것이다** — 그 옛 결정을
 *     근거로 글자로 되돌리지 말 것.
 *  🔴 **색은 `REQUIRED_MARK_COLOR` 하나다** — 화주포털(`.pv2-req`)이 같은 값을 쓴다.
 *     공개 폼과 포털에서 같은 뜻이 다른 색으로 보이면 안 된다.
 *  🔴 **`/apply` 지역 상수였던 것을 39차 A장에 여기로 옮겼다** — 공개 폼 3화면이 같은
 *     표시를 써야 한다(원칙 12·37·43 과 같은 결). 화면에 다시 적지 말 것.
 *  ⚠️ 이 표시는 **눈에 보이는 안내일 뿐 제출을 막지 않는다** — 막는 것은 각 화면의
 *     제출 직전 검사다(네이티브 `required` 는 React 핸들러보다 먼저 걸려 우리 오류
 *     문구가 안 뜬다 · PR #121 이 같은 자리에서 겪었다). **둘이 어긋나지 않게 할 것.**
 */
export const REQUIRED_MARK_COLOR = "#B4423A";

export const requiredMark = (
  <span aria-hidden style={{ marginLeft: 3, fontSize: 15, fontWeight: 700, color: REQUIRED_MARK_COLOR }}>
    *
  </span>
);

/** 입력창. 시안 값 그대로다. */
// 🔴 **입력창 글자는 16px 이다 — 시안의 15px 을 그대로 쓰지 말 것.**
// iOS Safari 는 16px 미만 입력창에 포커스하면 화면을 자동으로 확대하고, 그러면 뷰포트가
// 페이지보다 좁아져 좌우로 밀리는 것처럼 보인다(26차에 사용자가 「커지고 밀린다」로
// 신고한 것이 이것이다). 전역 `.public-form` 규칙이 16px 을 주지만 **인라인 style 이
// 그 CSS 를 이기므로** 값 자체를 올려둔다.
export const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  border: "1px solid #EBEAE7",
  borderRadius: 12,
  // 🔴 위 `trigger` 와 같은 이유로 #FAFAF8 이다 — 흰색으로 되돌리지 말 것.
  background: "#FAFAF8",
  fontFamily: "inherit",
  fontSize: 16,
  color: "#1A1A1A",
};

/** 옅은 회색(#F4F3EF) 블록 **안**에 놓이는 입력칸. 🔴 그 자리에서는 시안이 칸을 흰색으로
 *  뒤집는다(`/apply` 의 주요 출발지·도착지 하위 카드) — 같은 색을 겹치면 칸이 안 보인다. */
export const fieldOnTintStyle: CSSProperties = { ...fieldStyle, background: "#FFFFFF" };

/** 카드(흰 블록). */
export const cardStyle: CSSProperties = {
  padding: 32,
  background: "#FFFFFF",
  border: "1px solid #EFEEEA",
  borderRadius: 22,
};

export const cardTitleStyle: CSSProperties = { fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em" };

// 「선택」 배지. 🔴 시안 실측값이다(배경 #F0EFEB · 글자 #6C6B66) — 31차에 처음 옮길 때
// #F4F3EF / #8B8A85 로 두어 시안보다 흐렸고 사용자가 신고했다. 옅게 되돌리지 말 것.
export const optionChipStyle: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "#F0EFEB",
  fontSize: 12,
  fontWeight: 600,
  color: "#6C6B66",
};

export const searchBtnStyle: CSSProperties = {
  padding: "14px 18px",
  border: "none",
  whiteSpace: "nowrap",
  borderRadius: 12,
  background: "#EBEAE7",
  fontSize: 14,
  fontWeight: 600,
  color: "#4A4945",
  cursor: "pointer",
  fontFamily: "inherit",
};

/** 열려 있는 드롭다운/달력 키를 **하나만** 유지한다. 바깥 클릭·Esc 로 닫힌다. */
export function useOpenKey() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest?.("[data-dd]")) setOpenKey(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return { openKey, setOpenKey };
}

export function Dropdown({
  label,
  value,
  placeholder,
  options,
  onPick,
  openKey,
  setOpenKey,
  ddKey,
  pad = "15px 16px",
  disabled = false,
}: {
  label?: string;
  value?: string;
  placeholder: string;
  options: readonly string[];
  onPick: (v: string) => void;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  ddKey: string;
  pad?: string;
  /** 🔴 「지금」·「당착」·「내착」 칩이 켜졌을 때 칸을 잠근다(39차 B장) — 그 칩들은
   *  **시각을 담지 않는 선택지**라 손으로 고친 값이 남아 있으면 무엇이 요청인지 갈린다. */
  disabled?: boolean;
}) {
  const open = openKey === ddKey && !disabled;
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const i = value ? options.indexOf(value) : -1;
    setActive(i >= 0 ? i : 0);
  }, [open, value, options]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpenKey(ddKey);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const v = options[active];
      if (v !== undefined) {
        onPick(v);
        setOpenKey(null);
      }
    }
  }

  return (
    <div data-dd={ddKey} style={{ position: "relative" }}>
      {label && <label className="landing-field-label" style={fieldLabel}>{label}</label>}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          e.stopPropagation();
          setOpenKey(open ? null : ddKey);
        }}
        style={{
          ...trigger(!!value, pad),
          marginTop: label ? 8 : 0,
          ...(disabled ? { opacity: 0.55, cursor: "default" } : null),
        }}
      >
        <span>{value || placeholder}</span>
        <span aria-hidden style={{ fontSize: 11, lineHeight: 1, color: "#8B8A85" }}>▼</span>
      </button>
      {open && (
        <div role="listbox" ref={listRef} style={menu}>
          {options.map((o, i) => (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={o === value}
              onMouseEnter={() => setActive(i)}
              onClick={(e) => {
                e.stopPropagation();
                onPick(o);
                setOpenKey(null);
              }}
              style={menuItem(i === active, o === value)}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 이메일 입력 — **아이디 @ 도메인 + 도메인 고르기**(사용자 지시 2026-09-18 —
 * *「이메일 적는 곳에 다른 타사이트들 처럼 일반 도메인 주소를 선택하거나 직접입력 할수
 * 있게하자」*). 한국 사이트에서 흔한 모양 그대로다.
 *
 * 🔴 **저장값은 여전히 문자열 하나다**(`contact_email`) — 컬럼을 둘로 쪼개지 말 것.
 *    아이디·도메인을 따로 state 로 들지도 않는다. **값에서 매번 갈라 읽는다**(마지막
 *    `@` 기준). 별도 state 를 두면 프리필·초기화 때 두 값이 조용히 어긋난다.
 * 🔴 **도메인 칸을 읽기 전용으로 잠그지 말 것.** 잠그면 `naver.com` 을 고른 뒤
 *    회사 도메인으로 바꾸려면 「직접 입력」을 먼저 골라야 한다 — 고르는 것은 **바로
 *    가기일 뿐**이고 손으로 치는 길이 언제나 열려 있어야 한다.
 * 🔴 **고른 값을 따로 기억하지 않는다** — 드롭다운에 보이는 것은 **지금 도메인 값**이
 *    목록에 있으면 그것, 없으면 「직접 입력」이다. 그래서 손으로 고쳐도 표시가 맞는다.
 * ⚠️ 도메인을 비우면 저장값에 `@` 를 붙이지 않는다(`hong` 이지 `hong@` 가 아니다) —
 *    반쪽짜리 값은 화면이 아니라 **제출 직전 검사**가 막는다(`requiredMark` 주석과 같은 결).
 */
export const EMAIL_DIRECT_INPUT = "직접 입력";

/** 🔴 국내 주요 사이트(네이버·쿠팡·11번가 등)가 공통으로 두는 목록이다. 임의로 늘리지 말 것 —
 *  길어지면 고르는 것이 치는 것보다 느려진다. */
export const EMAIL_DOMAINS = [
  EMAIL_DIRECT_INPUT,
  "naver.com",
  "gmail.com",
  "daum.net",
  "hanmail.net",
  "nate.com",
  "kakao.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "yahoo.com",
] as const;

/** 저장값 → `{ local, domain }`. 🔴 **마지막 `@` 로 가른다**(로컬파트에 `@` 가 올 수 있다). */
export function splitEmail(value: string): { local: string; domain: string } {
  const at = value.lastIndexOf("@");
  if (at < 0) return { local: value, domain: "" };
  return { local: value.slice(0, at), domain: value.slice(at + 1) };
}

/** `{ local, domain }` → 저장값. 🔴 **도메인이 비면 `@` 를 붙이지 않는다.** */
export function joinEmail(local: string, domain: string): string {
  return domain ? `${local}@${domain}` : local;
}

/** 이메일이 **비었거나** `a@b.c` 꼴인가. 제출 직전 검사가 쓴다. */
export function isEmailShapeOk(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function EmailField({
  value,
  onChange,
  openKey,
  setOpenKey,
  ddKey = "email-domain",
}: {
  value: string;
  onChange: (v: string) => void;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  ddKey?: string;
}) {
  const { local, domain } = splitEmail(value);
  const picked = (EMAIL_DOMAINS as readonly string[]).includes(domain) ? domain : "";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <input
          type="text"
          inputMode="email"
          autoComplete="email"
          value={local}
          onChange={(e) => onChange(joinEmail(e.target.value, domain))}
          placeholder="아이디"
          aria-label="이메일 아이디"
          style={{ ...fieldStyle, minWidth: 0 }}
        />
        <span aria-hidden style={{ flex: "0 0 auto", fontSize: 15, color: "#8B8A85" }}>
          @
        </span>
        <input
          type="text"
          inputMode="url"
          value={domain}
          onChange={(e) => onChange(joinEmail(local, e.target.value))}
          placeholder="도메인"
          aria-label="이메일 도메인"
          style={{ ...fieldStyle, minWidth: 0 }}
        />
      </div>
      {/* 🔴 고르기는 **아랫줄**이다 — 칸 셋을 한 줄에 놓으면 3열 격자(한 칸 약 380px)와
          360px 화면에서 둘 다 눌린다. 실측해서 정한 배치다. */}
      <div style={{ marginTop: 8 }}>
        <Dropdown
          placeholder={EMAIL_DIRECT_INPUT}
          value={picked}
          options={EMAIL_DOMAINS}
          onPick={(v) => onChange(joinEmail(local, v === EMAIL_DIRECT_INPUT ? "" : v))}
          openKey={openKey}
          setOpenKey={setOpenKey}
          ddKey={ddKey}
        />
      </div>
    </>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dateLabel = (k: string) => {
  const p = k.split("-");
  return `${p[0]}. ${p[1]}. ${p[2]}.`;
};

const WEEKDAYS = [
  { d: "일", c: "#C05B54" },
  { d: "월", c: "#888378" },
  { d: "화", c: "#888378" },
  { d: "수", c: "#888378" },
  { d: "목", c: "#888378" },
  { d: "금", c: "#888378" },
  { d: "토", c: "#4C6FBF" },
];

/** 오늘(또는 `minKey`) 이전은 고를 수 없는 달력.
 *  🔴 하한을 빼지 말 것 — 과거 날짜로 접수되면 담당자가 되물어야 한다(원칙 6번). */
export function DatePicker({
  value,
  onPick,
  minKey,
  openKey,
  setOpenKey,
  ddKey,
  disabled = false,
}: {
  value?: string;
  onPick: (v: string) => void;
  minKey?: string | null;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  ddKey: string;
  /** 🔴 칩이 켜졌을 때 달력을 잠근다(39차 B장) — `Dropdown` 의 같은 prop 과 한 벌이다.
   *  🟢 **칩 줄은 이 부품 밖에 있어서 안 잠긴다** — 다시 눌러 끌 수 있어야 한다. */
  disabled?: boolean;
}) {
  const [monthOff, setMonthOff] = useState(0);
  const open = openKey === ddKey && !disabled;

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOff, 1);
  const y = base.getFullYear();
  const m = base.getMonth();
  const todayK = dateKey(now);
  const floor = minKey && minKey > todayK ? minKey : todayK;
  const firstDay = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();

  return (
    <div data-dd={ddKey} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpenKey(open ? null : ddKey);
        }}
        style={{ ...trigger(!!value, "14px 15px"), ...(disabled ? { opacity: 0.55, cursor: "default" } : null) }}
      >
        <span>{value ? dateLabel(value) : "날짜 선택"}</span>
        <span aria-hidden style={{ fontSize: 11, lineHeight: 1, color: "#8B8A85" }}>▼</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            zIndex: 11,
            width: 252,
            padding: 12,
            background: "#FFFFFF",
            border: "1px solid #EBEAE7",
            borderRadius: 14,
            boxShadow: "0 4px 12px rgba(26,26,26,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <button
              type="button"
              aria-label="이전 달"
              onClick={(e) => {
                e.stopPropagation();
                setMonthOff((v) => v - 1);
              }}
              style={{ border: "none", borderRadius: 8, background: "#F4F3EF", padding: "4px 9px", fontSize: 13.5, cursor: "pointer", opacity: monthOff <= 0 ? 0.35 : 1, fontFamily: "inherit" }}
            >
              ←
            </button>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>
              {y}. {pad2(m + 1)}
            </span>
            <button
              type="button"
              aria-label="다음 달"
              onClick={(e) => {
                e.stopPropagation();
                setMonthOff((v) => v + 1);
              }}
              style={{ border: "none", borderRadius: 8, background: "#F4F3EF", padding: "4px 9px", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
            >
              →
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginTop: 8 }}>
            {WEEKDAYS.map((w) => (
              <span key={w.d} style={{ textAlign: "center", padding: "3px 0", fontSize: 12, fontWeight: 600, color: w.c }}>
                {w.d}
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginTop: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const d = i + 1;
              const k = `${y}-${pad2(m + 1)}-${pad2(d)}`;
              const disabled = k < floor;
              const selected = k === value;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick(k);
                    setOpenKey(null);
                  }}
                  style={{
                    height: 28,
                    border: "none",
                    padding: 0,
                    borderRadius: "50%",
                    fontSize: 13.5,
                    cursor: disabled ? "default" : "pointer",
                    color: disabled ? "#EBEAE7" : "#1A1A1A",
                    background: selected ? "#FFD833" : "transparent",
                    fontWeight: selected ? 800 : 500,
                    fontFamily: "inherit",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** 06:00 ~ 22:00, 30분 간격.
 *  🔴 **`HH:mm` 이다** — 시안은 「오전 06:00」이지만 이 저장소의 관리자 화면·문자가 전부
 *     24시간 표기라 여기만 바꾸면 같은 건이 화면마다 다르게 보인다(26차 확정). */
export function timeSlots() {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60; m += 30) out.push(`${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
  return out;
}

/** 날짜(YYYY-MM-DD) + 시각(HH:mm) → `DateTimePicker` 와 같은 로컬 입력 문자열.
 *  🔴 저장할 때는 반드시 `localInputToISOString()` 을 거칠 것(원칙 41번). */
export function joinDateTime(dateK?: string, timeLabel?: string) {
  if (!dateK) return "";
  return `${dateK}T${timeLabel || "00:00"}`;
}

/** 날짜 빠른 선택 칩의 생김새. 🔴 **켜진 칩은 옐로다** — 랜딩 CTA·달력 선택일과 같은
 *  색이라야 「눌려 있다」로 읽힌다(`#FFD833`). 39차 B장이 「지금·당착·내착」을 넣으며
 *  켜짐 상태가 처음 생겼다. */
export function quickChipStyle(selected = false): CSSProperties {
  return {
    border: "none",
    padding: "5px 12px",
    borderRadius: 999,
    background: selected ? "#FFD833" : "#F4F3EF",
    fontSize: 13,
    fontWeight: selected ? 800 : 600,
    color: selected ? "#1A1A1A" : "#4A4945",
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}

/** 일정 칸 아래 줄의 「오늘」·「내일」 칩.
 *
 *  🔴 **`before` 는 「오늘」 앞에 온다** — 화주포털 발주요청이 「지금·당착·내착」을
 *     「오늘·내일」 **앞**에 두고(36차 PR 2), 두 폼이 같은 순서여야 같은 것으로 읽힌다.
 *  🔴 **이 줄은 `DatePicker` 밖, 날짜+시간 두 칸 아래에 놓는다**(39차 A장 리뷰 — 사용자
 *     지시 *"한줄 구성으로 배치하자"*). 달력 부품 **안**에 두면 가용 폭이 날짜 칸
 *     (실측 154px)뿐이라 **1280px 에서도 두 줄로 감겼다.** 🔴 되돌리지 말 것.
 *  🟢 **이 부품과 `DatePicker` 는 `/quote` 한 화면만 쓴다**(전수 확인) — 그래서 39차가
 *     시그니처를 넓히고 `quick` prop 을 없애도 다른 화면은 한 글자도 안 바뀐다.
 *  ⚠️ `extra` 는 칩 **뒤**에 붙는 회색 안내 한 줄이다(자리를 바꾸지 말 것). */
export function quickDateButtons(onPick: (k: string) => void, extra?: string, before?: ReactNode) {
  const jump = (n: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date();
    d.setDate(d.getDate() + n);
    onPick(dateKey(d));
  };
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
      {before}
      <button type="button" onClick={jump(0)} style={quickChipStyle()}>오늘</button>
      <button type="button" onClick={jump(1)} style={quickChipStyle()}>내일</button>
      {extra && <span style={{ fontSize: 13, color: "#9C9B95" }}>{extra}</span>}
    </div>
  );
}

/** 일정 칸 아래의 회색 안내 한 줄. 🔴 **칩이 왜 시각을 안 담는지**를 여기서 말한다 —
 *  안 적으면 화주가 「23:59 에 도착해 달라는 뜻인가」로 읽는다(발주요청과 같은 문구). */
export function scheduleHint(text?: string | null) {
  if (!text) return null;
  return <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, color: "#888378" }}>{text}</p>;
}
