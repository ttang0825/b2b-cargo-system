"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import SubmitDone from "@/components/landing/SubmitDone";
import AddressSearch from "@/components/AddressSearch";
import { ConsentRefusalNote, LandingConsentCard } from "@/components/PublicConsentFields";
import {
  DatePicker,
  Dropdown,
  cardStyle,
  cardTitleStyle,
  fieldLabel,
  fieldStyle,
  joinDateTime,
  optionChipStyle,
  quickChipStyle,
  quickDateButtons,
  requiredMark,
  scheduleHint,
  timeSlots,
  useOpenKey,
} from "@/components/landing/form/Fields";
import { VEHICLE_TYPES_PUBLIC, formatPhoneNumber } from "@/lib/constants";
import { QUOTE_BODY_TYPES } from "@/lib/vehicleBodyTypes";
import { LOADING_METHODS } from "@/lib/loadingMethods";
import { handleFormKeyDown } from "@/lib/preventEnterSubmit";
import { QUOTE_CONSENT } from "@/lib/legalInfo";
import { localInputToISOString } from "@/lib/localDateTime";
import {
  ARRIVAL_FILLER_TIME,
  arrivalNoteLine,
  type DropoffArrivalType,
} from "@/lib/arrivalType";
import { DROPOFF_MIN_GAP_LABEL, DROPOFF_MIN_GAP_MIN, isDropoffGapOk, minDropoffDateTime } from "@/lib/dropoffGap";
import { autoTransportTime } from "@/lib/transportTimeAuto";
import "@/app/landing.css";

// 완전공개 견적 문의 — 31차에 시안(디자인팀 Next 변환본)으로 껍데기를 갈아끼웠다.
//
// 🔴 **제출은 서버 API(`/api/quote-submit`)를 그대로 거친다** — 51차가 anon 직접 INSERT 를
//    서버 경유로 바꿨고(방금 넣은 행의 id 를 받아야 `consents.subject_id` 를 채운다),
//    화면에서 직접 DB 에 쓰는 방식으로 되돌리지 말 것.
// 🔴 **동의는 개인정보 하나뿐이다**(`CONSENT_TYPES_BY_SOURCE["/quote"] = ["privacy"]`).
//    약관 동의를 넣지 않는 것이 사용자 결정(2026-08-26)이다 — 견적 문의 자체는 계약이
//    아니고, 문구에 없는 동의를 기록하면 거짓이 된다(14차).
// 🔴 **선택지는 전부 정의처 참조다** — 톤수 `VEHICLE_TYPES_PUBLIC` · 차종
//    `QUOTE_BODY_TYPES`(22종) · 상하차조건 `LOADING_METHODS`(8종). 시안의 7종·6종을
//    따르지 말 것(25차가 7 → 21 로 늘렸고 리뷰에서 22종이 됐다).
// 🔴 **물품특성·운송시간·왕복/편도는 `rate_surcharges` 가 정본**이라 서버 API 로 이름만
//    받아온다(21차 — 금액은 비공개). 하드코딩하지 말 것.
// 🔴 **카테고리 이름에 슬래시가 있다 — `"왕복/편도"` 다.** 39차 A장 전까지 이 화면만
//    `surcharge["왕복편도"]`(슬래시 없음)로 찾고 있어서 **옵션이 0개**였고, 드롭다운을
//    눌러도 아무것도 안 나왔다(사용자 신고 「왕복,편도 드롭메뉴 안됨」). 다른 화면 넷은
//    전부 `"왕복/편도"` 였다. **키를 손으로 다시 적지 말고 아래 `SURCHARGE_KEYS` 를 쓸 것.**
//
// 🔴 **상세 정보(접이식) 값 중 DB 컬럼이 없는 것은 특이사항(`notes`)에 한 줄씩 붙인다.**
//    `public_quote_requests` 에는 물품특성·왕복/편도·대기시간·경유지수·희망 하차 일시·
//    운송시간 컬럼이 **없다**(코드 전수 확인). 31차는 DB 변경 0이 조건이라 27차가
//    「당착/내착」을 특이사항 한 줄로 이은 것과 같은 방식을 썼다 — 그 값들은 공개문의
//    상세와 **견적 전환 프리필**(`notes` → 견적 특이사항)까지 그대로 따라간다.
//    ⚠️ 컬럼을 만들자는 제안이 나오면 그때는 관리자 목록·상세·프리필까지 함께 봐야 한다.

// 「선택」 배지. 🔴 값은 `optionChipStyle`(Fields.tsx)이 유일 정의처다 — 31차 리뷰에
// 사용자가 "「선택」부분의 글씨가 시안과 선명도가 다르다"고 해서 그쪽 값을 시안 실측값
// (배경 #F0EFEB · 글자 #6C6B66)으로 올렸다. 여기서 다시 덮어쓰지 말 것.
const detailChip: CSSProperties = { ...optionChipStyle };

/** 🔴 `rate_surcharges.category` 이름. **DB 값과 한 글자도 다르면 안 된다** — 서버가
 *  `category` 로 그룹핑해서 내려주므로, 이름이 어긋나면 그 칸만 **빈 배열**이 되어
 *  선택지가 하나도 없는 드롭다운이 된다(예외도 경고도 없다 · 원칙 55번과 같은 결).
 *  🔴 화면에서 문자열을 직접 적지 말고 이 상수를 쓸 것 — 39차 A장이 고친 버그가
 *     정확히 「직접 적다가 슬래시를 빠뜨린 것」이다. */
const SURCHARGE_KEYS = {
  trait: "물품특성",
  trip: "왕복/편도",
  transport: "운송시간",
} as const;

type Picks = Record<string, string>;

export default function PublicQuotePage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    origin: "",
    originDetail: "",
    originSido: "",
    originSigungu: "",
    destination: "",
    destinationDetail: "",
    destinationSido: "",
    destinationSigungu: "",
    item: "",
    notes: "",
    waitingMinutes: "",
    waypointCount: "",
  });

  // 드롭다운·달력 값. 🔴 열림은 화면 전체에서 하나뿐이다(`useOpenKey`).
  const [picks, setPicks] = useState<Picks>({
    // 🔴 톤수 기본값은 **빈 값(「선택 안 함」)** 이다 — 시안이 그렇고, `VEHICLE_TYPES_PUBLIC[0]`
    //    으로 두면 고르지 않은 화주의 문의가 전부 「1톤」으로 접수되어 담당자가 되묻게 된다.
    ton: "",
    load: LOADING_METHODS[0].label,
    unload: LOADING_METHODS[0].label,
  });
  const pick = (k: string) => (v: string) => setPicks((p) => ({ ...p, [k]: v }));
  const { openKey, setOpenKey } = useOpenKey();

  /* ── 일정 칩 (39차 B장) ────────────────────────────────────────────────────
   *
   * 사용자 지시: *"견적문의 「일정」 부분도 발주요청과 유사하게 조정"*
   *
   * 🔴 **포털 부품(`components/pv2/Pv2DateTimeField.tsx`)을 끌어오지 않았다** — `.pv2-*`
   *    스코프가 통째로 딸려온다(원칙 57번). 같은 **동작**을 랜딩 생김새로 옮긴 것이고,
   *    자리 채움 시각(`ARRIVAL_FILLER_TIME`)과 하차 하한(`lib/dropoffGap.ts`)만
   *    정의처를 함께 쓴다. 36차 PR 2 가 관리자에 한 것과 같은 방식이다.
   * 🔴 **칩이 켜지면 날짜·시간 칸을 잠근다** — 「지금」·「당착」은 **시각을 담지 않는
   *    선택지**라, 손으로 고친 값이 남아 있으면 무엇이 요청인지 갈린다.
   */
  const [pickupNow, setPickupNow] = useState(false);
  const [dropoffArrival, setDropoffArrival] = useState<DropoffArrivalType | null>(null);

  // 🔴 물품특성·운송시간·왕복편도는 `rate_surcharges` 가 정본이라 서버에서 이름만 받는다.
  const [surcharge, setSurcharge] = useState<Record<string, string[]>>({});
  const [optionError, setOptionError] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/customer/surcharge-options", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        if (json?.error || !Array.isArray(json?.data)) {
          setOptionError(true);
          return;
        }
        const grouped: Record<string, string[]> = {};
        for (const row of json.data as { category: string; option_name: string }[]) {
          (grouped[row.category] ||= []).push(row.option_name);
        }
        setSurcharge(grouped);
      })
      // 🔴 에러를 삼키지 않는다(원칙 55번) — 다만 이 세 항목은 선택이라 폼 전체를 막지 않고
      //    안내 한 줄만 띄운다.
      .catch(() => alive && setOptionError(true));
    return () => {
      alive = false;
    };
  }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const todayKey = (() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const nowTime = () => {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  /** "YYYY-MM-DD" 에 하루를 더한다. 🔴 문자열을 자르지 말고 `Date` 로 더할 것 —
   *  월말(09-30 → 10-01)에서 어긋난다. */
  const nextDayKey = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    const dt = new Date(y, m - 1, d + 1);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  };

  /** 「지금」 — 누른 그 시각으로 채우고, 제출 직전에 폼이 다시 지금으로 맞춘다(36차와 같다). */
  function toggleNow() {
    setPickupNow((on) => {
      if (on) return false;
      setPicks((p) => ({ ...p, calLoad: todayKey, loadTime: nowTime() }));
      return true;
    });
    // 🔴 상차가 지금으로 바뀌면 당착·내착의 기준일이 오늘이 된다 — 켜져 있으면 다시 맞춘다.
    setDropoffArrival((a) => {
      if (a) setPicks((p) => ({ ...p, calUnload: a === "same_day" ? todayKey : nextDayKey(todayKey) }));
      return a;
    });
  }

  /** 「당착」·「내착」 — 🔴 **상차 날짜를 먼저 골라야 누를 수 있다**(상차일 기준이다). */
  function toggleArrival(kind: DropoffArrivalType) {
    const baseDay = pickupNow ? todayKey : picks.calLoad;
    if (!baseDay) return;
    setDropoffArrival((cur) => {
      if (cur === kind) return null;
      setPicks((p) => ({
        ...p,
        calUnload: kind === "same_day" ? baseDay : nextDayKey(baseDay),
        unloadTime: ARRIVAL_FILLER_TIME,
      }));
      return kind;
    });
  }

  /* 🔴 **상차 날짜를 바꾸면 당착·내착이 따라가야 한다** — 안 따라가면 「당착」이라 적혀
   *    있는데 하차 날짜는 옛 상차일에 묶인 상태가 된다(칸이 잠겨 있어 손으로 못 고친다). */
  useEffect(() => {
    if (!dropoffArrival) return;
    const baseDay = pickupNow ? todayKey : picks.calLoad;
    if (!baseDay) return;
    const want = dropoffArrival === "same_day" ? baseDay : nextDayKey(baseDay);
    setPicks((p) => (p.calUnload === want ? p : { ...p, calUnload: want, unloadTime: ARRIVAL_FILLER_TIME }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks.calLoad, pickupNow, dropoffArrival]);

  /* 🔴 **운송시간은 상차일시를 보고 자동으로 맞춘다**(39차 C장) — 규칙은
   *    `lib/transportTimeAuto.ts` 하나이고 발주요청·관리자 견적 등록이 같은 함수를 쓴다.
   *    화주가 직접 바꿀 수 있고, **바꾼 뒤에 상차일시를 또 고치면 다시 자동으로 맞춰진다**
   *    (관리자 화면이 전부터 그렇게 동작했고 두 화면이 같아야 한다).
   * 🔴 **선택지가 아직 안 내려왔으면 아무것도 안 고른다** — `autoTransportTime` 이
   *    실제 목록 안에 있을 때만 값을 준다. */
  const transportOptions = surcharge[SURCHARGE_KEYS.transport];
  const pickupForAuto = pickupNow ? joinDateTime(todayKey, picks.loadTime) : joinDateTime(picks.calLoad, picks.loadTime);
  useEffect(() => {
    if (!pickupForAuto) return;
    const matched = autoTransportTime(pickupForAuto, transportOptions || []);
    if (matched) setPicks((p) => (p.transport === matched ? p : { ...p, transport: matched }));
  }, [pickupForAuto, transportOptions]);

  const pickupLocalNow = joinDateTime(picks.calLoad, picks.loadTime);
  /** 🔴 하한은 `lib/dropoffGap.ts` 가 정한다 — 이 화면에 숫자를 적지 말 것(36차 D장). */
  const minDropoff = minDropoffDateTime(picks.calLoad ? pickupLocalNow : "");
  const minDropoffDay = minDropoff ? minDropoff.slice(0, 10) : picks.calLoad;
  /** 같은 날이면 상차 +30분보다 이른 시각은 아예 안 보여준다(달력은 날짜만 막는다). */
  const dropoffTimeOptions = (() => {
    const all = timeSlots();
    if (!minDropoff || !picks.calUnload || picks.calUnload !== minDropoff.slice(0, 10)) return all;
    const floor = minDropoff.slice(11);
    return all.filter((t) => t >= floor);
  })();

  /** 🔴 DB 컬럼이 없는 상세 값을 특이사항 한 줄씩으로 만든다. 값이 없으면 줄을 안 만든다. */
  function buildNotes() {
    const lines: string[] = [];
    const add = (label: string, v?: string) => {
      if (v && v.trim()) lines.push(`· ${label}: ${v.trim()}`);
    };
    add("물품특성", picks.trait);
    add("왕복/편도", picks.trip);
    add("운송시간", picks.transport);
    add("대기시간", form.waitingMinutes ? `${form.waitingMinutes}분` : "");
    add("경유지 수", form.waypointCount ? `${form.waypointCount}곳` : "");
    // 🔴 **당착·내착이면 하차 일시를 적지 않는다**(39차 B장) — 그 값의 시각은
    //    `ARRIVAL_FILLER_TIME`(자리 채움)이라 「23:59 도착 요청」으로 읽히면 안 된다.
    //    대신 `lib/arrivalType.ts` 의 한 줄을 그대로 쓴다 — 견적 전환 프리필과 견적 폼
    //    칩이 **같은 줄**을 써야 중복 판정이 성립한다.
    const dropoff = joinDateTime(picks.calUnload, picks.unloadTime);
    if (!dropoffArrival) add("희망 하차 일시", picks.calUnload ? dropoff.replace("T", " ") : "");

    const base = form.notes.trim();
    const arrival = arrivalNoteLine(dropoffArrival);
    if (lines.length === 0) return [base, arrival].filter(Boolean).join("\n");
    return [base, "※ 상세 정보", ...lines, arrival].filter(Boolean).join("\n");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 🔴 검사 순서는 **화면에 보이는 순서**와 같아야 한다 — 출발지가 비었는데 「성함을
    //    입력해주세요」가 뜨면 화면의 「필수」 표시와 안내가 서로 다른 곳을 가리킨다.
    // 🔴 네이티브 `required` 를 쓰지 않는 것은 의도다(폼에 `noValidate` 가 붙어 있다) —
    //    브라우저 검사가 React 핸들러보다 먼저 걸려 우리 오류 문구가 안 뜬다(PR #121).
    if (!form.origin.trim() || !form.destination.trim()) {
      setError("출발지와 도착지를 입력해주세요.");
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      setError("성함(업체명)과 연락처를 입력해주세요.");
      return;
    }
    if (!agreed) {
      setError("개인정보 수집·이용에 동의해주셔야 문의를 접수할 수 있습니다.");
      return;
    }

    // 🔴 상차 일시는 현재 시각 이후만 — 달력이 막지만 제출 직전에 한 번 더 본다(원칙 25번).
    // 🔴 「지금」이 켜져 있으면 **제출하는 그 시각**으로 다시 맞춘다 — 폼을 열어둔 채
    //    시간이 흘렀는데 누른 시각이 그대로 나가면 「지금」이 아니다(36차와 같은 처리).
    const pickupLocal = pickupNow
      ? joinDateTime(todayKey, nowTime())
      : joinDateTime(picks.calLoad, picks.loadTime);
    if (!pickupNow && picks.calLoad && picks.calLoad < todayKey) {
      setError("희망 상차 일시는 현재 시각 이후로 선택해주세요.");
      return;
    }

    // 🔴 하차 하한. **당착·내착은 예외다**(27차·36차 D장) — 시각이 무관한 선택지라
    //    규칙을 걸면 23:40 상차 + 당착 건의 접수가 막힌다.
    const dropoffLocal = joinDateTime(picks.calUnload, picks.unloadTime);
    if (!dropoffArrival && picks.calLoad && picks.calUnload && !isDropoffGapOk(pickupLocal, dropoffLocal)) {
      setError(`희망 하차 일시는 ${DROPOFF_MIN_GAP_LABEL}.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/quote-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          // 🔴 이메일 칸은 31차 리뷰에 없앴다(사용자 지시 — 시안에도 없다).
          //    `public_quote_requests.email` 컬럼과 API 는 그대로 두고 항상 null 을 보낸다.
          email: null,
          origin: [form.origin.trim(), form.originDetail.trim()].filter(Boolean).join(" "),
          origin_sido: form.originSido || null,
          origin_sigungu: form.originSigungu || null,
          destination: [form.destination.trim(), form.destinationDetail.trim()].filter(Boolean).join(" "),
          destination_sido: form.destinationSido || null,
          destination_sigungu: form.destinationSigungu || null,
          vehicle_type: picks.ton || null,
          item: form.item.trim() || null,
          pickup_loading_method: picks.load || null,
          dropoff_loading_method: picks.unload || null,
          // 🔴 저장은 반드시 `localInputToISOString()` 을 거친다(원칙 41번) — 오프셋 없는
          //    문자열을 그대로 넣으면 `timestamptz` 에서 KST 기준 최대 9시간 밀린다.
          requested_pickup_at: pickupNow || picks.calLoad ? localInputToISOString(pickupLocal) : null,
          notes: buildNotes() || null,
          // ⚠️ `agreed`는 form과 분리된 별도 state라 명시적으로 함께 보낸다.
          agreed,
        }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(data.error || "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      setSuccess(true);
    } catch {
      setSaving(false);
      setError("문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  const dd = (
    key: string,
    label: string | undefined,
    options: readonly string[],
    placeholder: string,
    pad?: string,
    disabled?: boolean
  ) => (
    <Dropdown
      ddKey={key}
      label={label}
      options={options}
      placeholder={placeholder}
      value={picks[key]}
      onPick={pick(key)}
      openKey={openKey}
      setOpenKey={setOpenKey}
      pad={pad}
      disabled={disabled}
    />
  );

  return (
    <div className="landing-page public-form" style={{ width: "100%", margin: "0 auto", overflowX: "clip", background: "#F4F3F0", color: "#0E0F12" }}>
      <LandingHeader />

      <section className="landing-quote" style={{ padding: "170px max(56px, calc((100% - 1200px) / 2)) 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.035em" }}>무료 견적 문의</h1>
            {/* ⚠️ 시안은 「평일 기준 평균 30분 이내 회신」이었다 — 랜딩 FAQ 가 「평일 업무
                시간에 접수된 건은 당일 안에 회신」이라 두 화면이 다른 시간을 약속하게 되어
                FAQ 문구로 맞췄다. */}
            <p style={{ margin: "16px auto 44px", maxWidth: 820, fontSize: 15.5, lineHeight: 1.8, color: "#6C6B65", textWrap: "pretty" } as CSSProperties}>
              연락처와 구간만 남겨주시면 가능 차량과 운임을 확인해 안내드립니다. 평일 업무 시간에 접수된 건은 당일 안에 회신드립니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720, margin: "0 auto" }}>
              {/* ── 필수 입력 ─────────────────────────── */}
              <div style={cardStyle}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
                  <label className="landing-field-label" style={fieldLabel}>출발지 {requiredMark}</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        origin: p.destination,
                        originDetail: p.destinationDetail,
                        originSido: p.destinationSido,
                        originSigungu: p.destinationSigungu,
                        destination: p.origin,
                        destinationDetail: p.originDetail,
                        destinationSido: p.originSido,
                        destinationSigungu: p.originSigungu,
                      }))
                    }
                    style={{ marginLeft: "auto", padding: "6px 12px", border: "none", borderRadius: 999, background: "#F4F3EF", fontSize: 13, fontWeight: 600, color: "#4A4945", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    ⇄ 출발지·도착지 바꾸기
                  </button>
                </div>
                {/* 🔴 주소검색은 공용 `AddressSearch` 다(원칙 37번) — 시안의 「주소검색」
                    버튼은 자리만 있었다. 다음 우편번호 스크립트는 `useDaumPostcode` 가
                    페이지당 한 번만 로드한다. */}
                <div style={{ marginTop: 8 }}>
                  <AddressSearch
                    label=""
                    className="landing-addr"
                    value={form.origin}
                    detailValue={form.originDetail}
                    onChange={(address, sido, sigungu) =>
                      setForm((p) => ({ ...p, origin: address, originSido: sido, originSigungu: sigungu }))
                    }
                    onDetailChange={(v) => setField("originDetail", v)}
                    placeholder="도로명주소 검색 또는 직접 입력"
                    detailPlaceholder="상세주소 (동/층/호수, 창고 위치 등)"
                  />
                </div>

                <label className="landing-field-label" style={{ ...fieldLabel, marginTop: 20 }}>도착지 {requiredMark}</label>
                <div style={{ marginTop: 8 }}>
                  <AddressSearch
                    label=""
                    className="landing-addr"
                    value={form.destination}
                    detailValue={form.destinationDetail}
                    onChange={(address, sido, sigungu) =>
                      setForm((p) => ({ ...p, destination: address, destinationSido: sido, destinationSigungu: sigungu }))
                    }
                    onDetailChange={(v) => setField("destinationDetail", v)}
                    placeholder="도로명주소 검색 또는 직접 입력"
                    detailPlaceholder="상세주소 (동/층/호수, 하차장 위치 등)"
                  />
                </div>

                <div className="landing-main-pick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 20 }}>
                  {dd("ton", "톤수", VEHICLE_TYPES_PUBLIC, "선택 안 함")}
                  {dd("form", "차종", QUOTE_BODY_TYPES, "선택 안 함")}
                </div>

                <label className="landing-field-label" style={{ ...fieldLabel, marginTop: 20 }}>운송물건</label>
                <input
                  type="text"
                  value={form.item}
                  onChange={(e) => setField("item", e.target.value)}
                  placeholder="운송할 물품을 입력하세요"
                  style={{ ...fieldStyle, marginTop: 8 }}
                />

                <label className="landing-field-label" style={{ ...fieldLabel, marginTop: 20 }}>성함 / 업체명 {requiredMark}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="예: (주)한빛상사"
                  style={{ ...fieldStyle, marginTop: 8 }}
                />

                <label className="landing-field-label" style={{ ...fieldLabel, marginTop: 20 }}>연락처 {requiredMark}</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={13}
                  value={form.phone}
                  onChange={(e) => setField("phone", formatPhoneNumber(e.target.value))}
                  placeholder="010-0000-0000"
                  style={{ ...fieldStyle, marginTop: 8 }}
                />

                {/* 🔴 동의 문구는 `lib/legalInfo.ts` 가 유일 정의처다 — 여기에 적지 말 것.
                    🔴 카드는 `/apply` 와 **같은 `LandingConsentCard`** 를 쓴다(31차 리뷰) —
                       두 화면이 갈리면 같은 동의가 화면마다 다르게 보인다.
                    🔴 여기 링크는 **개인정보처리방침 하나뿐이다**(사용자 지시 2026-09-01).
                       `/quote` 는 약관 동의를 받지 않으므로(14차·18차 확정) 약관·이메일
                       무단수집거부 전문을 여기에 걸어두면 받지 않은 동의처럼 읽힌다. */}
                <div style={{ marginTop: 20 }}>
                  <LandingConsentCard
                    checked={agreed}
                    onChange={setAgreed}
                    title={QUOTE_CONSENT.label}
                    desc={QUOTE_CONSENT.detail}
                    // 🔴 **좁은 화면(≤700px)에서는 이 설명을 감춘다**(사용자 지시
                    //    2026-09-18 PR #177 리뷰 — *「모바일 견적문의에서도 개인정보
                    //    동의는 같은 방식으로 처리하자」*). `/apply` 와 같은 prop 이고
                    //    사유·남겨야 할 것은 `PublicConsentFields` 의 `descWideOnly`
                    //    주석에 있다 — 읽지 않고 되돌리지 말 것.
                    // ⚠️ **이 화면에는 거부권 문단이 원래 없다**(`QUOTE_CONSENT` 에
                    //    `refusal` 이 없다 · `/apply` 와 다른 점). 그래서 좁은 화면에
                    //    남는 것은 제목과 **「전문 보기」뿐**이고, 그 링크를 빼면 고지가
                    //    통째로 사라진다. 🔴 **「전문 보기」를 지우지 말 것.**
                    descWideOnly
                    doc="privacy"
                  />
                  {/* 🔴 거부권 안내 — 개인정보보호법 제15조 2항 4호가 요구한다.
                      ⚠️ **이 화면에는 원래 없었다**(2026-09-18 PR #177 리뷰에서 드러나
                      사용자 지시로 넣었다). `/apply` 와 **같은 부품·같은 문장**이고
                      정의처는 `lib/legalInfo.ts` 의 `CONSENT_REFUSAL_NOTICE` 다.
                      🔴 좁은 화면에서도 감추지 말 것 — 설명글을 감춘 뒤 이 줄과
                      「전문 보기」가 남는 전부다. */}
                  <ConsentRefusalNote />
                </div>
              </div>

              {/* ── 상세 정보 토글 ─────────────────────── */}
              <div style={{ marginTop: 6 }}>
                <div className="landing-detail-head" style={{ fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.03em" }}>
                  자세히 적을수록 견적이 정확해집니다
                </div>
                <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.7, color: "#6C6B65" }}>
                  차량·품목·상하차 조건을 남기시면 빠르게 확정운임을 안내드릴 수 있습니다.
                </div>
                <button
                  type="button"
                  aria-expanded={detailOpen}
                  onClick={() => setDetailOpen((v) => !v)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", marginTop: 18, padding: "22px 32px", border: "1px solid #E4E3DE", borderRadius: 22, background: "#FFFFFF", color: "#0E0F12", fontSize: 15.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {detailOpen ? "접기 ▲" : "상세 정보 입력하기 ▼"}
                </button>
              </div>

              {detailOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* 화물 · 차량 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={detailChip}>선택</span>
                      <div style={cardTitleStyle}>화물 · 차량</div>
                    </div>
                    <p style={{ margin: "8px 0 20px", fontSize: 13.5, lineHeight: 1.7, color: "#888378" }}>모르시는 항목은 비워두셔도 됩니다.</p>
                    {optionError && (
                      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#B4423A" }}>
                        물품특성·왕복/편도·운송시간 선택지를 불러오지 못했습니다. 비워두고 보내셔도 됩니다.
                      </p>
                    )}
                    <div className="landing-cargo-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
                      {dd("trait", "물품특성", surcharge[SURCHARGE_KEYS.trait] || [], "선택 안 함", "14px 15px")}
                      {dd("trip", "왕복/편도", surcharge[SURCHARGE_KEYS.trip] || [], "선택 안 함", "14px 15px")}
                      {dd("load", "상차조건", LOADING_METHODS.map((m) => m.label), "기본운송", "14px 15px")}
                      {dd("unload", "하차조건", LOADING_METHODS.map((m) => m.label), "기본운송", "14px 15px")}
                      <div>
                        <label className="landing-field-label" style={fieldLabel}>대기시간(분)</label>
                        {/* 🔴 무료 대기시간은 **20분**이다(25차에 30 → 20분으로 바뀐 가격 변경) —
                            시안 문구의 「무료 30분」을 그대로 쓰지 말 것. */}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.waitingMinutes}
                          onChange={(e) => setField("waitingMinutes", e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="무료 20분 초과분만 가산"
                          style={{ ...fieldStyle, marginTop: 8, padding: "14px 15px" }}
                        />
                      </div>
                      <div>
                        <label className="landing-field-label" style={fieldLabel}>경유지 수</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.waypointCount}
                          onChange={(e) => setField("waypointCount", e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="0"
                          style={{ ...fieldStyle, marginTop: 8, padding: "14px 15px" }}
                        />
                      </div>
                    </div>
                    {/* ⚠️ 시안은 「수작업·지게차·호크(크레인)·도크」였다 — 우리 정본은 8종이고
                        🔴 호이스트(차량 자체 장착)와 크레인(별도 장비 수배)은 **다른 것**이라
                        합치면 배차가 틀어진다(25차). */}
                    <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.7, color: "#888378" }}>
                      기본운송은 차량 적재함에서 상하차하며 별도 장비·인력이 필요하지 않은 경우입니다. 그 밖의 조건은 현장에 맞춰 선택해 주세요.
                    </p>
                  </div>

                  {/* 일정 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={detailChip}>선택</span>
                      <div style={cardTitleStyle}>일정</div>
                    </div>
                    {/* 🔴 칩 순서는 **「지금·당착·내착」이 「오늘·내일」 앞**이다 —
                        화주포털 발주요청이 그렇고(36차 PR 2), 두 폼이 같은 순서여야
                        화주가 같은 것으로 읽는다.
                        🔴 **칩이 켜지면 날짜·시간 칸을 잠근다** — 그 선택지들은 시각을
                        담지 않으므로 손으로 고친 값이 남으면 무엇이 요청인지 갈린다. */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: "20px 24px", marginTop: 20, alignItems: "start" }}>
                      <div>
                        <label className="landing-field-label" style={fieldLabel}>희망 상차 일시</label>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <DatePicker
                            ddKey="calLoad"
                            value={picks.calLoad}
                            onPick={pick("calLoad")}
                            openKey={openKey}
                            setOpenKey={setOpenKey}
                            disabled={pickupNow}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {dd("loadTime", undefined, timeSlots(), "시간 선택", "14px 15px", pickupNow)}
                          </div>
                        </div>
                        {quickDateButtons(
                          pick("calLoad"),
                          undefined,
                          <button type="button" onClick={toggleNow} style={quickChipStyle(pickupNow)} aria-pressed={pickupNow}>
                            지금
                          </button>
                        )}
                        {scheduleHint(pickupNow ? "지금 바로 상차 — 시간은 접수 시각으로 들어갑니다" : null)}
                      </div>
                      <div>
                        <label className="landing-field-label" style={fieldLabel}>희망 하차 일시</label>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <DatePicker
                            ddKey="calUnload"
                            value={picks.calUnload}
                            onPick={pick("calUnload")}
                            minKey={minDropoffDay}
                            openKey={openKey}
                            setOpenKey={setOpenKey}
                            disabled={dropoffArrival !== null}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {dd("unloadTime", undefined, dropoffTimeOptions, "시간 선택", "14px 15px", dropoffArrival !== null)}
                          </div>
                        </div>
                        {quickDateButtons(
                          pick("calUnload"),
                          undefined,
                          <>
                            {/* 🔴 상차 날짜를 먼저 골라야 누를 수 있다 — 당착·내착은 **상차일 기준**이다. */}
                            <button
                              type="button"
                              onClick={() => toggleArrival("same_day")}
                              disabled={!pickupNow && !picks.calLoad}
                              aria-pressed={dropoffArrival === "same_day"}
                              title={!pickupNow && !picks.calLoad ? "상차 날짜를 먼저 선택해주세요" : undefined}
                              style={{ ...quickChipStyle(dropoffArrival === "same_day"), ...(!pickupNow && !picks.calLoad ? { opacity: 0.45, cursor: "default" } : null) }}
                            >
                              당착
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleArrival("next_day")}
                              disabled={!pickupNow && !picks.calLoad}
                              aria-pressed={dropoffArrival === "next_day"}
                              title={!pickupNow && !picks.calLoad ? "상차 날짜를 먼저 선택해주세요" : undefined}
                              style={{ ...quickChipStyle(dropoffArrival === "next_day"), ...(!pickupNow && !picks.calLoad ? { opacity: 0.45, cursor: "default" } : null) }}
                            >
                              내착
                            </button>
                          </>
                        )}
                        {scheduleHint(
                          dropoffArrival === "same_day"
                            ? "당착 — 상차 당일 도착, 시각은 무관합니다"
                            : dropoffArrival === "next_day"
                            ? "내착 — 상차 다음 날 도착, 시각은 무관합니다"
                            : picks.calLoad
                            ? `상차 +${DROPOFF_MIN_GAP_MIN}분 이후`
                            : null
                        )}
                      </div>
                      {dd("transport", "운송시간", surcharge[SURCHARGE_KEYS.transport] || [], "선택 안 함", "14px 15px")}
                    </div>
                  </div>

                  {/* 요청사항 */}
                  <div style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={detailChip}>선택</span>
                      <div style={cardTitleStyle}>요청사항</div>
                    </div>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder="상하차 조건 관련 요청, 반복 운송 여부, 기타 참고사항"
                      style={{ ...fieldStyle, marginTop: 16, resize: "vertical" }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "#FDF3F2", color: "#B4423A", fontSize: 14, lineHeight: 1.6 }}>
                  {error}
                </div>
              )}
            </div>

            <div className="landing-submit-bar" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 32 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ minWidth: 340, maxWidth: "100%", padding: "20px 36px", whiteSpace: "nowrap", background: "#FFD834", color: "#0E0F12", border: "1px solid #FFD834", borderRadius: 16, fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "접수 중..." : "견적 문의 보내기"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <LandingFooter />

      {success && (
        <SubmitDone
          title="견적 문의가 접수되었습니다"
          message="담당자가 확인 후 남겨주신 연락처로 가능 차량과 운임을 안내드립니다."
          extra={
            <div style={{ marginTop: 16, padding: "16px 20px", border: "1px solid #EBEAE7", borderRadius: 16, fontSize: 13.5, lineHeight: 1.7, color: "#6C6B65" }}>
              <strong style={{ display: "block", color: "#0E0F12", fontSize: 14.5 }}>계속 거래하실 계획이신가요?</strong>
              신청하시면 운송관리 화면에서 견적·배차·정산 현황을 직접 확인하실 수 있습니다.{" "}
              <Link href="/apply" style={{ fontWeight: 700, color: "#0E0F12", textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap" }}>
                운송관리 계정 신청 →
              </Link>
            </div>
          }
        />
      )}
    </div>
  );
}
